
import {default as F} from "faunadb";
import * as FS from "fs";

const {
  Paginate,
  Collections, Get,
  Function: FN,
  Database,
  Query,
  Create,
  CreateFunction,
  Collection,
  Var,
  LowerCase,
  Ref,
  Lambda,
  Select,
  Map,
  Functions,
  Indexes,
  Role,
  CreateRole,
  Roles
} = F.query;

const db_secret_key = process.env.FAUNA_SECRET;
const db_domain     = process.env.FAUNA_DOMAIN;

if (!db_secret_key) {
  console.error("Secret key not set.");
  process.exit(1);
}
if (!db_domain) {
  console.error("Database domain not set.");
  process.exit(1);
}

const DEFAULT_CLIENT_VALUES = {
  port: 443,
  scheme: "https",
  keepAlive: false,
  timeout: 5
}; // const

function Select_Map_Paginate(x) {
  return Select(
    "data",
    Map(
      Paginate(x),
      Lambda("x", Get(Var("x")))
    )
  );
} // func

class Fauna_Sync {

  constructor(client_values) {
    if (!client_values.secret) {
      throw new Error("Secret key not set.");
    }
    if (!client_values.domain) {
      throw new Error("Database domain not set.");
    }
    this.client      = new F.Client(Object.assign({}, DEFAULT_CLIENT_VALUES, client_values));
    this.collections = [];
    this.functions   = [];
    this.indexes     = [];
    this.roles       = [];
    this.client
    this.db_schema   = {};
    this.db_schema_loaded = false;
  } // constructor

  async load_schema() {
    if (this.db_schema_loaded) {
      throw new Error("Schema already loaded.");
    }
    this.db_schema = await this.client.query({
      // collections: Select_Map_Paginate(Collections()),
      // functions: Select_Map_Paginate(Functions()),
      // indexes: Select_Map_Paginate(Indexes()),
      roles: Select_Map_Paginate(Roles())
    });
    return this.db_schema;
  } // method

  schema() {
    return this.db_schema;
  } // method

  role(name, f) {
    const create_role = f(name);
    if (!create_role) {
      throw new Error(`Invalid value (${create_role}) for: ${f.toString()}`);
    }
    Fauna_Sync.validate("create_role", create_role);
    this.roles.push(create_role);
  } // method

  static validate(name, value) {
    const json = JSON.stringify(value);
    const js = JSON.parse(json);
    if (!js[json]) {
      throw new Error(`Invalid ${name}: ${json}`);
    }
    return true;
  } // static

  static Select_Map_Paginate = Select_Map_Paginate;

} // class

export { Fauna_Sync };
