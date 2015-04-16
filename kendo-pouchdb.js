(function (f, define) {
    define(["PouchDB", "./kendo.data"], f);
})(function (PouchDB) {

    if (!PouchDB) {
        throw new Error('Please include "pouchdb.js" before kendo-pouchdb');
    }

    (function ($) {

        //Create pouchdb transport
        var pouchdbTransport = kendo.data.RemoteTransport.extend({
            init: function (options) {
                var pouchdb = options && options.pouchdb ? options.pouchdb : {},
                    db = pouchdb.db,
                    idFactory = pouchdb.idFactory;

                if (!db) {
                    throw new Error('The "db" option must be set.');
                }

                if (!(db instanceof PouchDB)) {
                    throw new Error('The "db" option must be a PouchDB object.');
                }

                this.db = db;

                if (!idFactory) {
                    throw new Error('The "idFactory" option must be set.');
                }

                this.idFactory = (typeof idFactory === "function") ? idFactory : function (data) {
                    return data[idFactory];
                };

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

                this.db.allDocs({ include_docs: true })
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
                        }
                        options.error(err);
                    });
            },

            create: function (options) {

                var data = options.data;

                //TODO: use pouchdb-collate, as described [here](http://pouchdb.com/2014/06/17/12-pro-tips-for-better-code-with-pouchdb.html).
                data._id = "" + this.idFactory(data);

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
                //    this._crud(options, "destroy");

                var data = options.data;

                this._crud("destroy", data, options, function (d) {
                    return this.db.remove(d);
                });

            }

        });

        $.extend(true, kendo.data, {
            transports: {
                pouchdb: pouchdbTransport
            }
        });

        var original = {
            DataSource: kendo.data.DataSource
        };

        //Replace DataSource
        //Remember to check _ispouchdb property on each overriden function
        kendo.data.DataSource = kendo.data.DataSource.extend({
            //_ispouchdb property will be set if pouchdb type

            init: function (options) {
                if (options && options.type && options.type === "pouchdb") {
                    var that = this;

                    //This will indicate that dataset's type is pouchdb.
                    this._ispouchdb = true;

                    options = $.extend(true, {
                        schema: {
                            model: {
                                id: "_id"
                            }
                        }
                    }, options);

                    if (options.schema.model.id !== "_id") {
                        throw new Error('The model.id option should not be provided - use transport.idFactory instead');
                    }

                    //defaulting serverNNN options to true.
                    options.serverPaging = options.serverPaging === undefined ? true : options.serverPaging;
                    options.serverFiltering = options.serverFiltering === undefined ? true : options.serverFiltering;
                    options.serverSorting = options.serverSorting === undefined ? true : options.serverSorting;
                    options.serverGrouping = options.serverGrouping === undefined ? true : options.serverGrouping;
                    options.serverAggregates = options.serverAggregates === undefined ? true : options.serverAggregates;

                }

                original.DataSource.fn.init.apply(this, arguments);
            },

            //handles create and update
            pushCreate: function (items) {
                var dbItem, datasourceItem;
                if (this._ispouchdb) {
                    //in such case, items will contain a single item

                    dbItem = items[0];
                    datasourceItem = this.get(dbItem._id);

                    // check already fetched
                    if (datasourceItem !== undefined) {
                        //check change was caused by datasource itself, in which case push should not propagate
                        if (dbItem._rev !== datasourceItem._rev) {
                            //change arrived from PouchDB
                            return original.DataSource.fn.pushUpdate.apply(this, arguments);
                        } else {
                            //change causes by datasource itself and synced with PouchDB
                            return undefined;
                        }
                        
                    } else {
                        return original.DataSource.fn.pushCreate.apply(this, arguments);
                    }

                }
                return original.DataSource.fn.pushCreate.apply(this, arguments);
            }
        });

    })(window.kendo.jQuery);

    return window.kendo;

}, typeof define == 'function' && define.amd ? define : function (_, f) { f(window.PouchDB); });