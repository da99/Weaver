
import {default as F} from "faunadb";
// import * as FS from "fs";

type Privilege = {
  resource: F.Expr,
  actions: {
    read: boolean,
    write: boolean,
    create: boolean,
    delete: boolean,
    history_read: boolean,
    history_write: boolean,
    unrestricted_read: boolean
  }
} // type

type Old_Schema = {
  collections: [Param_Object],
  functions:   [Param_Object],
  indexes:     [Param_Object],
  roles:       [Param_Object]
} // type

type New_Schema = {
  collections: Param_Object_Group,
  functions:   Param_Object_Group,
  indexes:     Param_Object_Group,
  roles:       Param_Object_Group
} // type

interface Migrate_Action {
  action: string,
  resource_type: keyof New_Schema,
  resource_name: string,
  fql: F.Expr,
  param_object?: Param_Object,
  old_fql?: any
} // interface

interface Param_Object_Group {
 [key: string]: Param_Object
}

interface Param_Object_Data {
   hash_version?: string,
   [key: string]: any
}

interface Param_Object {
 ref?: F.Expr,
 name: string,
 privileges?: Array<Privilege>,
 history_days?: number,
 role?: F.Expr,
 body?: F.Expr,
 data?: Param_Object_Data
}

interface Client_Options {
  secret?: string,
  domain?: string,
}


const {
  Paginate,
  Database, Collection,  Role,
  Get, Query,
  Function: FN,
  Functions, Roles, Collections, Indexes,
  Create, CreateFunction, CreateRole, CreateCollection, CreateIndex,
  Var,
  Ref,
  Lambda,
  LowerCase,
  Select,
  Map,
  Delete,
  Update
} = F.query;

const RESOURCE_TYPES = {
  role:       "roles",
  collection: "collections",
  function:   "functions",
  index:      "indexes"
};

const DEFAULT_CLIENT_VALUES: F.ClientConfig = {
  secret: "none",
  port: 443,
  scheme: "https",
  keepAlive: false,
  timeout: 5
}; // const

function Select_Map_Paginate(x: F.Expr) {
  return Select(
    "data",
    Map(
      Paginate(x),
      Lambda("x", Get(Var("x")))
    )
  );
} // func

class Weaver {
  client: F.Client;

  __old_schema: Old_Schema | null;
  __new_schema: New_Schema;

  constructor(client_values: Client_Options) {
    if (!client_values.secret) {
      throw new Error("Secret key not set.");
    }
    if (!client_values.domain) {
      throw new Error("Database domain not set.");
    }
    this.client      = new F.Client(Object.assign({}, DEFAULT_CLIENT_VALUES, client_values));
    this.__new_schema = {
      "functions":   {},
      "indexes":     {},
      "collections": {},
      "roles":       {}
    };

    this.__old_schema   = null;
  } // constructor

  async load_schema() {
    if (this.__old_schema) {
      throw new Error("Schema already loaded.");
    }
    this.__old_schema = await this.client.query({
      collections: Select_Map_Paginate(Collections()),
      functions: Select_Map_Paginate(Functions()),
      indexes: Select_Map_Paginate(Indexes()),
      roles: Select_Map_Paginate(Roles())
    });
    return this.__old_schema;
  } // method

  get old_schema() : Old_Schema {
    if (!this.__old_schema) {
      throw new Error("Schema not loaded.");
    }
    return this.__old_schema;
  } // method

  get new_schema() : New_Schema {
    return this.__new_schema;
  }

  __CREATE_RESOURCE(resource_type: keyof New_Schema, param_object: Param_Object) {
    const data = param_object.data || {};
    if (!data.hash_version) {
      data.hash_version = btoa(JSON.stringify(param_object));
    }
    param_object.data = data;
    this.new_schema[resource_type][param_object.name] = param_object;
    return param_object;
  } // method

  CreateRole(param_object: Param_Object) {
    return this.__CREATE_RESOURCE("roles", param_object);
  } // method

  CreateIndex(param_object: Param_Object) {
    return this.__CREATE_RESOURCE("indexes", param_object);
  } // method

  CreateFunction(param_object: Param_Object) {
    return this.__CREATE_RESOURCE("functions", param_object);
  } // method

  CreateCollection(param_object: Param_Object) {
    return this.__CREATE_RESOURCE("collections", param_object);
  } // method

  each_new_resource(f: (x: keyof New_Schema, z: Param_Object) => void) {
    const new_schema = this.new_schema;
    for (const k of (Object.keys(new_schema) as Array<keyof New_Schema>)) {
      Object.values(new_schema[k]).forEach((r) => f(k, r));
    } // for
  } // method

  static Select_Map_Paginate = Select_Map_Paginate;

  each_old_resource(f: (x: keyof Old_Schema, z: Param_Object) => void) {
    for(const k of (Object.keys(this.old_schema) as Array<keyof Old_Schema>) ) {
      for(const po of this.old_schema[k]) {
        f(k, po);
      }
    } // for
  } // method

  diff() {
    const old_schema = this.old_schema;
    const new_actions: Array<Migrate_Action> = [];

    this.each_new_resource((resource_type, new_r) => {
        const name = new_r.name;
        const old_r = find_name(this.old_schema[resource_type], name);
        if (old_r) {
          if (!same_version(old_r, new_r)) {
            new_actions.push({
              action: "update",
              resource_type,
              resource_name: name,
              param_object: new_r,
              fql: Update((old_r.ref as F.Expr), new_r),
              old_fql: old_r
            });
          } // if
        } else {
          new_actions.push({
            action: "create",
            resource_type,
            resource_name: name,
            fql: CreateResource(resource_type, new_r)
          });
        }
    }) // each_new_resource

    // Delete:
    this.each_old_resource((resource_type: keyof Old_Schema, old_r: Param_Object) => {
      const name = old_r.name;
      if (!this.new_schema[resource_type][name]) {
        new_actions.push({
          action: "delete",
          resource_type,
          resource_name: name,
          fql: Delete(old_r.ref as F.Expr),
          old_fql: old_r
        });
      }
    });

    return new_actions;
  } // method

} // class

function CreateResource(r_type: keyof New_Schema, r: Param_Object) {
  switch (r_type) {
    case "functions":
      return CreateFunction(r);
    case "indexes":
      return CreateIndex(r);
    case "collections":
      return CreateCollection(r);
    case "roles":
      return CreateRole(r);
    default:
      throw new Error(`Invalid resource type: ${r_type}`);
  } // switch
} // function

function same_version(old_o: Param_Object, new_o: Param_Object) {
  const old_hash_version = (old_o.data || {}).hash_version;
  return old_hash_version === (new_o.data as Param_Object_Data).hash_version;
} // function

function find_name(arr: Array<Param_Object>, name_value: string) {
  return arr.find(x => x.name === name_value);
} // function

export { Weaver };

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

