# kendo-pouchdb

![Alt Work in Progress](<http://terikon.github.io/kendo-pouchdb/images/work-in-progress.png>)
Connecting [DataSource](<http://docs.telerik.com/kendo-ui/framework/datasource/overview>) 
object of [Kendo UI](<http://www.telerik.com/kendo-ui>) with
[PouchDB](<http://pouchdb.com/>) database.

Kendo UI widgets can be bound to data with *kendo.data.DataSource* object. With this project DataSource can be used on top
of PouchDB database, with bi-directional synchronization between them. 

# Table of contents

- [Demo](#demo)
- [Work status](#work-status)
- [Install](#install)
- [Use](#use)
- [API](#api)
- [Things to consider for future versions](#things-to-consider-for-future-versions)
- [Contribute](#contribute)

# Demo

See online demo of kendo-pouchdb [here](<http://terikon.github.io/kendo-pouchdb/demo/kendo-pouchdb-grid.html>).

Data is being put into *demodb* database, and will be presented with kendo grid. You can create/update/delete records,
and they will persist in the database. Just reload the page to see your data again.

Using [PouchDB Inspector](<https://chrome.google.com/webstore/detail/pouchdb-inspector/hbhhpaojmpfimakffndmpmpndcmonkfa>)
is recommended with demo. If you change a document in database with this tool, the grid will present your change immediately. 

Demos reside in [demo](https://github.com/terikon/kendo-pouchdb/tree/master/demo) folder.

# Work status

Implemented
- CRUD operations on PouchDB database arrive in DataSource in form of push events.
- CRUD operations on DataSource are synced with PouchDB when sync method is called.
- Tests for implemented functionality.

In progress
- Implement filtering.
- Implement grouping.
- Batch option support.
- Support for PouchDB Collate.
- Add demos and jsbin/dojo examples.
- Add the lib to CDN.
- Write documentation.

# Install

TODO

# Use

Include kendo-pouchdb.js after Kendo and PouchDB libraries.

Then create pouchdb datasource:

```js
var dataSource = new kendo.data.DataSource({
    type: "pouchdb",
    transport: {
        pouchdb: {
            db: db,
            idFactory: function (data) {
                return data.ProductID;
            }
        }
    });
```
Do not supply id field in schema like this, as _id field will be used as id field:
```js
schema: {
    model: {
        id: "ProductID", //This is wrong, do not supply id to kendo-pouchdb
        fields: {
            ProductID: { type: number },
            ProductName: { type: string }
        }
    }
}
```

TODO

# API

TODO

# Things to consider for future versions

- TODO 

# Contribute

Use [GitHub issues](https://github.com/terikon/kendo-pouchdb/issues) and [Pull Requests](https://github.com/terikon/kendo-pouchdb/pulls).

Ideas are welcome as well :)

To build:
	
    npm run build

Before committing, please run jshint:

    npm run jshint

To run tests:

    npm run test

Tests reside in [tests/spec](https://github.com/terikon/kendo-pouchdb/tree/master/tests/spec) folder.