const Docker = require('dockerode');
const containerized = require('containerized');
const logger = require('../logger/Logger').get();

const localhostIp = '127.0.0.1';

let dockerode = new Docker();

function getProperties(container) {
  return Object.assign({}, container.Labels);
}

function getIpAddress(container) {
  if (containerized()) {
    const firstKey = Object.keys(container.NetworkSettings.Networks)[0];
    return container.NetworkSettings.Networks[firstKey].IPAddress;
  }
  return localhostIp;
}

function getPort(container) {
  if (containerized()) {
    return container.Ports[0].PrivatePort;
  }
  return container.Ports[0].PublicPort;
}

/**
 * Class providing a Docker client implementation that collects information on engines that
 * run locally as containers in a non-cluster configuration.
 */
class LocalDockerClient {
  /**
   * Gets the Dockerode instance used.
   * Mainly for testing purposes. Should normally not be used externally.
   * @returns {Docker} The Dockerode instance used for Docker Engine API access.
   */
  static get docker() { return dockerode; }

  /**
   * Sets the Dockerode instance to use.
   * Mainly for testing purposes. Should normally not be used externally,
   * @param {Docker} value - The Dockerode instance to use for Docker Engine API access.
   */
  static set docker(value) { dockerode = value; }

  /**
   * Lists engines.
   * @param {string} engineImageName - The Engine Docker image name used to determine if a
   *   container is an engine instance.
   * @returns {Promise<EngineContainerSpec[]>} A promise to a list of engine container specs.
   */
  static async listEngines(engineImageName) {
    return new Promise((resolve, reject) => {
      LocalDockerClient.docker.listContainers((err, containers) => {
        if (!err) {
          const engineContainers = containers.filter(
            container => (container.Image.indexOf(engineImageName) === 0)
              && (container.Names.length > 0));
          const engineInfoEntries = engineContainers.map((container) => {
            const properties = getProperties(container);
            const ipAddress = getIpAddress(container);
            const port = getPort(container);
            const key = `${ipAddress}:${port}`;
            return { key, properties, ipAddress, port };
          });
          resolve(engineInfoEntries);
        } else {
          logger.error('Failed to list engine containers', err);
          reject(err);
        }
      });
    });
  }
}

module.exports = LocalDockerClient;
