// Modules
const Alerts = require('./modules/Alerts');
const Clustering = require('./modules/Clustering');
const Cluster = require('./cluster/Cluster');
const Communication = require('./modules/Communication');
const Configuration = require('./modules/Configuration');
const Logger = require('./modules/Logger');
const Queue = require('./modules/Queue');
const Registry = require('./modules/Registry');
const Sharding = require('./modules/Sharding');
const Stats = require('./modules/Stats');

// Default transport
const Console = require('./transports/Console');

class Sharder {
    constructor(instanceID, options, modules) {
        this.modules = modules;
        this.instanceID = instanceID;

        if (!instanceID) {
            throw new Error('instanceID not provided');
        }

        this.config = modules.Configuration || new Configuration(instanceID, options);
    }

    async create() {
        await this.config.init();

        let { token, sharding, clustering, stats, communication } = await this.config.getConfig();

        this.logger = this.modules.logger || new Logger();
        this.alerts = this.modules.alerts || new Alerts();
        this.registry = this.modules.registry || new Registry();
        this.queue = this.modules.queue || new Queue();
        this.communication = this.modules.communication || new Communication(communication, this.logger, this.registry);
        this.sharding = this.modules.sharding || new Sharding(sharding, token, this.instanceID, this.logger, this.alerts);
        this.clustering = this.modules.clustering || new Clustering(clustering, this.instanceID, this.communication, this.sharding, this.registry, this.logger, this.alerts, this.queue);
        this.stats = this.modules.stats || new Stats(stats, this.communication, this.logger);

        return Promise.resolve();
    }

    async init() {
        if (!this.clustering.isMaster) return;

        this.logger.registerTransport(new Console(this.options.logger));

        await this.logger.init();
        await this.alerts.init();
        await this.communication.init();
        await this.sharding.init();
        this.clustering.init();

        return Promise.resolve();
    }

    addInstance(instanceID, options) {
        this.registry.registerInstance(instanceID, options);

        // TODO: Add support for connecting to instance through communication
    }

    updateInstance(instanceID, options) {
        this.registry.deleteInstance(instanceID);

        this.registry.registerInstance(instanceID, options);
    }
}

module.exports = Sharder;