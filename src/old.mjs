
class NewActions {
  constructor() {
    this._read              = false;
    this._write             = false;
    this._create            = false;
    this._delete            = false;
    this._history_read      = false;
    this._history_write     = false;
    this._unrestricted_read = false;
  }
  read(b) { return this._read = b; } // method
  write(b) { return this._write = b; } // method
  create(b) { return this._create = b; } // method
  delete(b) { return this._delete = b; } // method
  history_read(b) { return this._history_read = b; } // method
  history_write(b) { return this._history_write = b; } // method
  unrestricted_read(b) { return this._unrestricted_read = b; } // method
  as_object() {
    return {
      read: this._read,
      write: this._write,
      create: this._create,
      delete: this._delete,
      history_read: this._history_read,
      history_write: this._history_write,
      unrestricted_read: this._unrestricted_read
    };
  } // method
} // class

function NewPrivilege(resource, f) {
  const new_actions = new NewActions();
  f(new_actions);
  return {resource, actions: new_actions.as_object()};
} // class
