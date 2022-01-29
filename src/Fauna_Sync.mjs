
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
  Roles,
  Delete,
  Update
} = F.query;

const RESOURCE_TYPES = [
  ["role","roles"],
  ["collection", "collections"],
  ["function", "functions"],
  ["index", "indexes"]
];

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
    this.collections = {};
    this.functions   = {};
    this.indexes     = {};
    this.roles       = {};
    this.db_schema   = null;
  } // constructor

  async load_schema() {
    if (this.db_schema) {
      throw new Error("Schema already loaded.");
    }
    this.db_schema = await this.client.query({
      collections: Select_Map_Paginate(Collections()),
      functions: Select_Map_Paginate(Functions()),
      indexes: Select_Map_Paginate(Indexes()),
      roles: Select_Map_Paginate(Roles())
    });
    return this.db_schema;
  } // method

  get schema() {
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

  CreateRole(param_object) {
    const data = param_object.data || {};
    if (!data.hash_version) {
      data.hash_version = btoa(JSON.stringify(param_object));
    }
    param_object.data = data;
    this.roles[param_object.name] = param_object;
    return param_object;
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

  diff() {
    const schema = this.schema;
    const new_actions = [];

    for (const [resource_type, plural] of RESOURCE_TYPES) {
      for (const [name, new_r] of Object.entries(this[plural])) {
        const old_r = find_name(schema[plural], name);
        if (old_r) {
          if (!same_version(old_r, new_r)) {
            new_actions.push({
              action: "update",
              resource_type,
              resource_name: name,
              fql: Update(old_r.ref, new_r)
            });
          } // if
        } else {
          console.log(`Create role: ${name}`);
          new_actions.push({
            action: "create",
            resource_type,
            resource_name: name,
            fql: CreateResource(resource_type, new_r)
          });
        }
      } // for
    } // for

    // Delete:
    for (const [resource_type, plural] of RESOURCE_TYPES) {
      for (const old_r of schema[plural]) {
        const name = old_r.name;
        if (!this[plural][name]) {
          new_actions.push({
            action: "delete",
            resource_type,
            resource_name: name,
            fql: Delete(old_r.ref)
          });
        }
      } // for
    } // for

    return new_actions;
  } // method

} // class

function CreateResource(r_type, r) {
  switch (r_type) {
    case "function":
      return CreateFunction(r);
    case "index":
      return CreateIndex(r);
    case "database":
      return CreateDatabase(r);
    case "role":
      return CreateRole(r);
    default:
      throw new Error(`Invalid resource type: ${r_type}`);
  } // switch
} // function

function same_version(old_o, new_o) {
  const old_hash_version = (old_o.data || {}).hash_version;
  return old_hash_version === new_o.data.hash_version;
} // function

function diff_create(schema, fsync) {
  const new_actions = [];

  // New roles:
  for (const [name, new_r] of Object.entries(fsync.roles)) {
    if (!has_name(schema.roles, name)) {
      console.log(`Create: ${name}`);
      new_actions.push(CreateRole(new_r));
    }
  } // for

  return new_actions;
} // func

function diff_delete(schema, fsync) {
  const new_deletes = [];

  // Roles:
  for (const role of schema.roles) {
    if (!fsync.roles[role.name]) {
      console.log(`Delete: ${role.name}`);
      new_deletes.push(Delete(Role(role.name)));
    }
  } // for
  return new_deletes;
} // func

function find_name(arr, name_value) {
  return arr.find(x => x.name === name_value);
} // function

function array_to_object_by_key(arr, key) {
  const new_o = {};
  arr.forEach(x => {
    new_o[x[key]] = x;
  });
  return new_o;
} // function

export { Fauna_Sync };

// CreateRole({
//   name: "cloudflare_worker_function",
//   privileges: [
//     {
//       resource: Collection("screen_name"),
//       actions: {
//         read: true,
//         write: true,
//         create: true,
//         delete: false,
//         history_read: false,
//         history_write: false,
//         unrestricted_read: false
//       }
//     }
//   ]
// }) ;

