
import {default as F} from "faunadb";
import * as FS from "fs";
import {Fauna_Sync} from "./Fauna_Sync";
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


function read_file_fn(f_name: string) {
  const file_name = `tmp/${f_name}`;
  return FS.readFileSync(
    file_name,
    {encoding:'utf8', flag:'r'}
  );
};


const fauna_sync = new Fauna_Sync({
  secret: process.env.FAUNA_SECRET,
  domain: process.env.FAUNA_DOMAIN
});

fauna_sync.CreateRole({
  name: "cloudflare_worker",
  privileges: [
    {
      resource: Collection("screen_name"),
      actions: {
        read: true,
        write: true,
        create: true,
        delete: false,
        history_read: false,
        history_write: false,
        unrestricted_read: false
      }
    }
  ]
}) ;

function split(x: string) {
  return x.split(/\s+/).map(x => x.trim()).filter(x => x && (x.length > 0));
} // function

for (const name of split("\
  labeling screen_name console page mail permission_list\
  upgrade club account keep_me_updated profile purchase configuration contact\
  social_activity")) {
  fauna_sync.CreateCollection({name, history_days: 1});
} // for

fauna_sync.CreateFunction({
  name: "create_account",
  body: Query(
    Lambda(
      ["email", "screen_name"],
      Create(Collection("screen_name"), {
        data: {
          account: Select(
            ["ref"],
            Create(Collection("account"), { data: { email: Var("email") } })
          ),
          file_name: LowerCase(Var("screen_name")),
          name: Var("screen_name")
        }
      })
    )
  ),
  role: Role("cloudflare_worker")

}); // create func

(async function() {
  await fauna_sync.load_schema();
  // console.log(fauna_sync.schema);
  fauna_sync.diff().forEach(x => {
    if (x.resource_name === "labeling") {
      console.log(x);
    }
    // console.log(`${x.action} ${x.resource_type} ${x.resource_name}`);
  });
})(); // function
