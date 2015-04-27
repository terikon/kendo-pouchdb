# kendo-pouchdb

[![Build Status](https://travis-ci.org/terikon/kendo-pouchdb.svg?branch=master)](https://travis-ci.org/terikon/kendo-pouchdb)

![Alt Work in Progress](<http://terikon.github.io/kendo-pouchdb/images/work-in-progress.png>)

Connecting [DataSource](<http://docs.telerik.com/kendo-ui/framework/datasource/overview>) 
object of [Kendo UI](<http://www.telerik.com/kendo-ui>) with
[PouchDB](<http://pouchdb.com/>) database.

Kendo UI widgets can be bound to data with *kendo.data.DataSource* object. With this project DataSource can be used on top
of PouchDB database, with bi-directional synchronization between them.

DataSource can be with sync with PouchDB local storage, like IndexedDB or Web SQL. And server side changes can be pushed
into DataSource in real time with CouchDB database, Cloudant or Couchbase.

# Table of contents

- [Demo](#demo)
- [Work status](#work-status)
- [Install](#install)
- [Use](#use)
- [Use with Couchbase Mobile](#use-with-couchbase-mobile)
- [API](#api)
- [Things to consider for future versions](#things-to-consider-for-future-versions)
- [Contribute](#contribute)

# Demo

See [online demo of kendo-pouchdb](<http://terikon.github.io/kendo-pouchdb/demo/kendo-pouchdb-grid.html>).

Data is being put into *demodb* database, and will be presented with kendo grid. You can create/update/delete records,
and they will persist in the database. Just reload the page to see your data again.

Using [PouchDB Inspector](<https://chrome.google.com/webstore/detail/pouchdb-inspector/hbhhpaojmpfimakffndmpmpndcmonkfa>)
is recommended with demo. If you change a document in database with this tool, the grid will present your change immediately. 

In addition,

- [Sorting demo](<http://terikon.github.io/kendo-pouchdb/demo/kendo-pouchdb-sort.html>)
- [Paging demo](<http://terikon.github.io/kendo-pouchdb/demo/kendo-pouchdb-paging.html>)

Demos reside in [demo](https://github.com/terikon/kendo-pouchdb/tree/master/demo) folder.

# Work status

Implemented
- CRUD operations on PouchDB database arrive in DataSource in form of push events.
- CRUD operations on DataSource are synced with PouchDB when sync method is called.
- Tests for implemented functionality.
- Support for PouchDB Collate in _id.
- Implement sorting.
- Add support for bower.
- Add to npmjs.
- Implement paging.

In progress
- Implement filtering.
- Implement grouping.
- Batch option support.
- Add demos and jsbin/dojo examples.
- Add the lib to CDN.
- Write documentation.

# Install

## with npm

```
npm install kendo-pouchdb
```

## with bower

```
bower install kendo-pouchdb
```

## include on page

Download **kendo-pouchdb.js**
[minified](https://raw.githubusercontent.com/terikon/kendo-pouchdb/master/dist/kendo-pouchdb.min.js) or
[debug](https://raw.githubusercontent.com/terikon/kendo-pouchdb/master/kendo-pouchdb.js).

Include jQuery, Kendo UI, [pouchdb.js](<https://github.com/pouchdb/pouchdb>)
and [pouchdb-collate.js](<https://github.com/pouchdb/collate>):

```html
<script src="http://cdn.kendostatic.com/2015.1.408/js/jquery.min.js"></script>
<script src="http://cdn.kendostatic.com/2015.1.408/js/kendo.all.min.js"></script>
<script src="http://cdn.jsdelivr.net/pouchdb/3.4.0/pouchdb.min.js"></script>
<script src="pouchdb-collate.js"></script>
<script src="kendo-pouchdb.min.js"></script>
```

# Use

Include kendo-pouchdb.js after Kendo and PouchDB libraries.

It will create kendo.data.PouchableDataSource that acts like casual kendo.data.DataSource, but can also be of "pouchdb" type.

Then create pouchdb datasource:

```js
var dataSource = new kendo.data.PouchableDataSource({
    type: "pouchdb",
    transport: {
        pouchdb: {
            db: db,
            idField: "ProductID"
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

_id will be created by applying [pouchCollate.toIndexableString](<https://github.com/pouchdb/collate/#toindexablestringobj>)
to data provided by idField, so data will be stored sorted by model id, either it string or numeric type.

## id field

id field can be of string and numeric type.
Do not use date field as id field.

## Model class

If model class is provided as schema model, it **should** have _id field as model's id:

```js
var Model = kendo.data.Model.define({
    id: "_id", //This should be provided

    fields: {
        name: { type: "string" }
    }
});
```

## Sorting

For sort to work, appropriate view should be provided for each field that will be used for sorting:

```js
var dataSource = new kendo.data.PouchableDataSource({
    type: "pouchdb",
    sort: { field: "name", dir: "asc"},
    transport: {
        pouchdb: {
            db: db,
            idField: "passport",
            fieldViews: {
              "name: "sortIndex/byName",
              "age" : "sortIndex/byAge"
            }
        }
    });
    
//Now you can sort by name
```

Exception will be thrown if trying to sort by field that has no index. Exception will be thrown if trying to sort by
multiple columns, this functionality is not supported.

Of course, the _id field can be sorted by without providing view for it. 

TODO

# Use with Couchbase Mobile

For POC project that binds Kendo Grid with [Couchbase Mobile](<http://www.couchbase.com/nosql-databases/couchbase-mobile>),
see [kendo-pouchdb-app](<https://github.com/terikon/kendo-pouchdb-app>).

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