const knex = require("knex");
const { AsyncLocalStorage } = require("async_hooks");
const config = require("../shared/config");

/**
 * @type {knex.Knex}
 */
const rootDb = knex({
  client: "postgresql",
  connection: {
    host: config.db.host,
    port: config.db.port,
    database: config.db.name,
    user: config.db.user,
    password: config.db.password,
  },
  pool: {
    min: 2,
    max: 10,
  },
});

const storage = new AsyncLocalStorage();

const db = new Proxy(
  function tenantAwareDatabase(...args) {
    const activeDb = storage.getStore()?.db || rootDb;
    return activeDb(...args);
  },
  {
    apply(_target, _thisArg, args) {
      const activeDb = storage.getStore()?.db || rootDb;
      return activeDb(...args);
    },
    get(_target, property) {
      if (property === "root") return rootDb;
      if (property === "runWithDatabase") {
        return (database, callback) => storage.run({ db: database }, callback);
      }
      const activeDb = storage.getStore()?.db || rootDb;
      const value = activeDb[property];
      return typeof value === "function" ? value.bind(activeDb) : value;
    },
  },
);

module.exports = db;
