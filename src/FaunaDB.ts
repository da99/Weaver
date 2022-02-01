
type Expr = {
  name: string,
  args: Array<any>
} // type

type Methods = {
  [key: string]: Expr
} // type

type Fauna = {
  query: Methods
} // type

const F: Fauna = {
  query: {
    Paginate: {name: "Paginate", args: []}
  }
}; // const

F.query["Var"] = {name: "Var", args: []};


export { F };
