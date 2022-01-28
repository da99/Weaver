
import {default as F} from "faunadb";
import * as FS from "fs";
import {Fauna_Sync} from "./Fauna_Sync.mjs";
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

async function get_save_fn(f_name) {
  const file_name = `tmp/${f_name}`;
  const results   = await get_fn(f_name);
  const json      = JSON.stringify(results);
  FS.writeFileSync(file_name, json);
  return FS.readFileSync(
    file_name,
    {encoding:'utf8', flag:'r'}
  );
} // func

function read_file_fn(f_name) {
  const file_name = `tmp/${f_name}`;
  return FS.readFileSync(
    file_name,
    {encoding:'utf8', flag:'r'}
  );
};

async function get_schema() {
  const result = await client.query({
    // collections: Select_Map_Paginate(Collections()),
    // functions: Select_Map_Paginate(Functions()),
    // indexes: Select_Map_Paginate(Indexes()),
    roles: Select_Map_Paginate(Roles())
  });
  return result;
} // func

async function main() {
  const fauna_sync = new Fauna_Sync({
    secret: process.env.FAUNA_SECRET,
    domain: process.env.FAUNA_DOMAIN
  });
  const schema = await fauna_sync.load_schema();
  console.log(schema);
} // func
main();


