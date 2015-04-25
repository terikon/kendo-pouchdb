//Kendo UI DataSource adapter for PouchDB.

(function (f, define) {
    define(["PouchDB", "pouchCollate"], f);
})(function (PouchDB, pouchCollate) {

    if (!PouchDB) {
        throw new Error('Please include "pouchdb.js" before kendo-pouchdb');
    }

    if (!pouchCollate) {
        throw new Error('Please include "pouchdb-collate.js" before kendo-pouchdb');
    }

    (function ($) {

        //Create pouchdb transport
        var pouchdbTransport = kendo.data.RemoteTransport.extend({
            init: function (options) {
                var pouchdb = options && options.pouchdb ? options.pouchdb : {},
                    db = pouchdb.db,
                    idField = pouchdb.idField,
                    fieldViews = pouchdb.fieldViews || {};

                if (!db) {
                    throw new Error('The "db" option must be set.');
                }

                if (!(db instanceof PouchDB)) {
                    throw new Error('The "db" option must be a PouchDB object.');
                }

                this.db = db;

                if (!idField) {
                    throw new Error('The "idField" option must be set.');
                }

                this.idField = idField;

                this.fieldViews = fieldViews;

                kendo.data.RemoteTransport.fn.init.call(this, options);
            },

            push: function (callbacks) {

                this.db.changes({
                    since: 'now',
                    live: true,
                    include_docs: true
                }).on('change', function (change) {
                    // change.id contains the doc id, change.doc contains the doc

                    //TODO: check change.id is in selection range

                    if (change.deleted) {
                        callbacks.pushDestroy(change.doc);
                    } else {
                        // document was added/modified
                        // according to [this](http://pouchdb.com/guides/changes.html), cannot distinguish between added and modified

                        //call create, if already exist overriden DataSource.pushCreate will call pushUpdate.

                        callbacks.pushCreate(change.doc);
                    }

                }).on('error', function (err) {
                    // handle errors
                    //TODO
                });

            },

            read: function (options) {
                //options.data contain filter,group,page,sort info

                var fieldViewAndDir = this._getFieldViewAndDirForSort(options.data.sort),
                    queryMethod = fieldViewAndDir.fieldView ? this.db.query.bind(this.db, fieldViewAndDir.fieldView) : this.db.allDocs;


                queryMethod.call(this.db, { include_docs: true, descending: fieldViewAndDir.descending })
                    .then(function (response) {
                        var docs = $.map(response.rows, function (row) {
                            return row.doc;
                        });
                        options.success(docs);
                    })
                    .catch(options.error);

            },

            //Does not support read.
            //operation: function(data), called on this.
            _crud: function (type, data, options, operation) {
                operation.call(this, data)
                    .then(function (response) {
                        data._rev = response.rev;
                        options.success(data);
                    })
                    .catch(function (err) {
                        if (err.status === 409) {
                            //TODO: conflict resolution
                            console.log(kendo.format("kendo-pouchdb: conflict occured for {0}: {1}", type, err));
                        }
                        options.error(err);
                    });
            },

            create: function (options) {

                var data = options.data;

                //use pouchdb-collate, as described [here](http://pouchdb.com/2014/06/17/12-pro-tips-for-better-code-with-pouchdb.html).
                data._id = pouchCollate.toIndexableString(data[this.idField]);

                this._crud("create", data, options, function (d) {
                    return this.db.put(d);
                });

            },

            update: function (options) {

                var data = options.data;

                this._crud("update", data, options, function (d) {
                    return this.db.put(d);
                });

            },

            destroy: function (options) {

                var data = options.data;

                this._crud("destroy", data, options, function (d) {
                    return this.db.remove(d);
                });

            },

            //Returns {fieldView:string, descending:bool}.
            //For default index, returns {descending:bool}.
            _getFieldViewAndDirForSort: function (sorts) {
                var field, descending, fieldView;

                if (!sorts || sorts.length === 0) {
                    return { descending: false };
                }
                if (sorts.length > 1) {
                    throw new Error("Sorting by multiple fields is not supported by kendo-pouchdb");
                }
                field = sorts[0].field;
                descending = sorts[0].dir && sorts[0].dir === "desc";

                if (field === "_id" || field === this.idField) {
                    return { descending: descending };
                }

                fieldView = this.fieldViews[field];

                if (!fieldView) {
                    throw new Error("No PouchDB view provided for sorting by '" + field + "'");
                }

                return { fieldView: fieldView, descending: descending };
            }

        });

        $.extend(true, kendo.data, {
            transports: {
                pouchdb: pouchdbTransport
            }
        });

        //Replacing kendo.data.DataSource object with alternative implementation does not work. kendo.data.DataSource.create method uses
        //'new DataSource' from closure, so it always creates original DataSource instance, which fails
        //'datasource instanceof kendo.data.DataSource' test.
        //
        //Remember to check _ispouchdb property on each overriden function
        var PouchableDataSource = kendo.data.DataSource.extend({
            //_ispouchdb property will be set if pouchdb type
            init: function (options) {
                if (options && options.type && options.type === "pouchdb") {
                    var that = this, Model;

                    options = $.extend(true, {}, options); //prevents aliasing

                    //This will indicate that dataset's type is pouchdb.
                    this._ispouchdb = true;

                    if (options.schema && options.schema.model && options.schema.model.fn && options.schema.model.fn instanceof kendo.data.Model) {
                        Model = options.schema.model;
                        if (Model.idField !== "_id") {
                            throw new Error('The Model\'s id option should be "_id"');
                        }
                    } else {

                        //Model was given as configuration, just set id to _id.
                        options = $.extend(true, {
                            schema: {
                                model: {
                                    id: "_id"
                                }
                            }
                        }, options);

                        if (options.schema.model.id !== "_id") {
                            throw new Error('The model.id option should not be provided or should be "_id"');
                        }

                    }

                    //defaulting serverNNN options to true.
                    options.serverPaging = options.serverPaging === undefined ? true : options.serverPaging;
                    options.serverFiltering = options.serverFiltering === undefined ? true : options.serverFiltering;
                    options.serverSorting = options.serverSorting === undefined ? true : options.serverSorting;
                    options.serverGrouping = options.serverGrouping === undefined ? true : options.serverGrouping;
                    options.serverAggregates = options.serverAggregates === undefined ? true : options.serverAggregates;

                    if (options.data) {
                        throw new Error('For DataSource of type pouchdb data option should not be provided');
                    }

                    //This is (a little hack) a way to pass options to transport.
                    options.data = {
                        //Here parameters to Transport can be put
                    
                    };

                }

                kendo.data.DataSource.fn.init.apply(this, arguments);
            },

            //handles create and update
            pushCreate: function (items) {
                var dbItem, datasourceItem;
                if (this._ispouchdb) {
                    //in such case, items will contain a single item

                    dbItem = items[0];
                    datasourceItem = this.get(dbItem._id); //TODO: take filter and paging into account

                    // check already fetched
                    if (datasourceItem !== undefined) {
                        //check change was caused by datasource itself, in which case push should not propagate
                        if (dbItem._rev !== datasourceItem._rev) {
                            //change arrived from PouchDB
                            return kendo.data.DataSource.fn.pushUpdate.apply(this, arguments);
                        } else {
                            //change causes by datasource itself and synced with PouchDB
                            return undefined;
                        }

                    } else {
                        return kendo.data.DataSource.fn.pushCreate.apply(this, arguments);
                    }

                }
                return kendo.data.DataSource.fn.pushCreate.apply(this, arguments);
            },

            //gets model id and calls original DataSource's get with id transformed by pouchCollate.toIndexableString.
            getByModelId: function (id) {
                if (this._ispouchdb) {
                    return kendo.data.DataSource.fn.get.call(this, pouchCollate.toIndexableString(id));
                }
                return kendo.data.DataSource.fn.get.apply(this, arguments);
            }

        });

        //Preserve kendo.data.DataSource's class methods (like create).
        PouchableDataSource.create = kendo.data.DataSource.create;
        //$.extend(PouchableDataSource, kendo.data.DataSource); //This does not work - kills init

        kendo.data.PouchableDataSource = PouchableDataSource;

    })(window.kendo.jQuery);

    return window.kendo;

}, typeof define == 'function' && define.amd ? define : function (_, f) { f(window.PouchDB, window.pouchCollate); });