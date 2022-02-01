
import {default as F} from "faunadb";
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
import http from "http";
const PORT = 3000;

function text(response, code, text) {
  response.statusCode = code;
  response.setHeader("Content-Type", "text/plain; charset=UTF-8");
  return response.end(text);
} // function

function json(response, code, text) {
  response.statusCode = code;
  response.setHeader("Content-Type", "application/json; charset=UTF-8");
  return response.end(text);
} // function

function get_data(request, f) {
  let body = "";
  request.on("data", (chunk) => {
    body += chunk;
  });
  request.on("end", () => {
    f(body);
  });
} // function

const requestHandler = (request, response) => {
  const path = `${request.method} ${request.url}`;
  switch(path) {
    case "GET /log":
      text(response, 200, path);
      break;

    case "POST /log":
      get_data(request, (body) => {
        let v = null;
        try {
          v = eval(body);
          console.log(v);
          json(response, 200, JSON.stringify({
            "you wrote": v,
            "as_string": v.toString()
          }));
        } catch(e) {
          json(response, 500, JSON.stringify({
            "name": e.name,
            "error": e.message
          }));
        }
      });
      break;

    default:
      response.statusCode = 404;
      response.setHeader("content-type", "text/plain; charset=UTF-8");
      text(response, 404, `not found: ${path}`);
  } // switch
} // const

const server = http.createServer(requestHandler)

server.listen(PORT, (err) => {
  if (err) {
    return console.log('something bad happened', err)
  }

  console.log(`server is listening on ${PORT}`)
})

