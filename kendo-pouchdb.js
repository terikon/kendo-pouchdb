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
                    defaultView = pouchdb.defaultView,
                    fieldViews = pouchdb.fieldViews || {};

                if (!db) {
                    throw new Error('The "db" option must be set.');
                }

                if (!(db instanceof PouchDB)) {
                    throw new Error('The "db" option must be a PouchDB object.');
                }

                if (!idField) {
                    throw new Error('The "idField" option must be set.');
                }

                this.db = db;
                this.idField = idField;
                this.defaultView = defaultView;
                this.fieldViews = fieldViews;
                this.dataSource = options.data.dataSource; //we initialize one in PouchableDataSource.init().

                kendo.data.RemoteTransport.fn.init.call(this, options);
            },

            push: function (callbacks) {

                var that = this,
                    changes = this.db.changes({
                        since: 'now',
                        live: true,
                        include_docs: true,
                        filter: that.defaultView ? "_view" : undefined,
                        view: that.defaultView
                    });


                changes.on('change', function (change) {
                    // change.id contains the doc id, change.doc contains the doc

                    var currentCrudPromises = that._crudPromises.slice(),
                        doc = change.doc,
                        datasourceItem;

                    //wait for all current crud promises to resolve
                    $.when.apply($, currentCrudPromises).then(function () {
                        if (change.deleted) {
                            callbacks.pushDestroy(doc);
                        } else {
                            // document was added/modified
                            // according to [this](http://pouchdb.com/guides/changes.html), cannot distinguish between added and modified

                            //call create, if already exist overriden DataSource.pushCreate will call pushUpdate.

                            //in such case, items will contain a single item

                            datasourceItem = that.dataSource.get(doc._id);

                            // check already fetched
                            if (datasourceItem !== undefined) {
                                //check change was caused by datasource itself, in which case push should not propagate
                                if (doc._rev !== datasourceItem._rev) {
                                    //change arrived from PouchDB
                                    callbacks.pushUpdate(doc);
                                } else {
                                    //change causes by datasource itself and synced with PouchDB
                                    return;
                                }
                            } else {
                                //do not propagate create if paging is currently enabled
                                if (!that.dataSource.pageSize()) {
                                    callbacks.pushCreate(doc);
                                }
                            }
                        }
                    });
                });

                changes.on('error', function (err) {
                    // handle errors
                    //TODO
                });

            },

            read: function (options) {
                //options.data contain filter,group,page,sort info

                var that = this,
                    fieldViewAndDir = that._getFieldViewAndDirForSort(options.data.sort),
                    useQuery = !!fieldViewAndDir.fieldView,
                    applyFilter,
                    applyPaging,
                    queryMethod = useQuery ? that.db.query.bind(that.db, fieldViewAndDir.fieldView) : that.db.allDocs,
                    skip,
                    limit = options.data.pageSize,
                    page = options.data.page,
                    //returns total number of design docs in database
                    countDocsToSubtract = function () {
                        if (useQuery || applyFilter) { //When allDocs is used, design documents are returned and needed to be subtracted
                            return PouchDB.utils.Promise.resolve(0);
                        }
                        return that.db.allDocs({ startkey: "_design/", endkey: "_design\uffff" }).then(function (result) {
                            return result.rows.length;
                        });
                    },
                    filterQueryOptions;

                that._validateFilter(options.data.filter, options.data.sort);
                filterQueryOptions = this._getFilterQueryOptions(options.data.filter);
                applyFilter = !!filterQueryOptions;

                if (limit !== undefined) {
                    if (page === undefined) {
                        page = 1;
                    }
                    skip = limit * (page - 1);
                } else {
                    skip = undefined;
                }
                applyPaging = (skip !== undefined || limit !== undefined);

                var totalQueryOptions = $.extend({ include_docs: false, reduce: "_count" }, filterQueryOptions),
                    queryOptions = $.extend({ include_docs: true, descending: fieldViewAndDir.descending, skip: skip, limit: limit }, filterQueryOptions);

                //TODO: create index (db.createIndex) if needed, calculate fields for it
                //TODO: use db.find to filter (selector), sort and page (with limit and skip).

                countDocsToSubtract().then(function (totalRowsToSubtract) {
                        return queryMethod.call(that.db, queryOptions)
                            .then(function (response) {
                                if (!useQuery && !applyFilter) {
                                    response.total_rows -= totalRowsToSubtract; //subtracts design documents from total_rows
                                    return response;
                                } else if (!applyPaging) {
                                    response.total_rows = 0;
                                    $.each(response.rows, function () {
                                        if (this.doc._id.indexOf("_design/") !== 0) {
                                            response.total_rows += 1;
                                        }
                                    });
                                    return response;
                                } else {
                                    return queryMethod.call(that.db, totalQueryOptions)
                                        .then(function (totalResult) {
                                            if (!useQuery) {
                                                response.total_rows = totalResult.rows.length;
                                                return response;
                                            }
                                            response.total_rows = totalResult.rows.length; //strangely, even when reduce:"_count" used, rows are still returned.
                                            return response;
                                        });
                                }
                            });
                    })
                    .then(function (response) {
                        options.success(response);
                    })
                    .catch(function (err) {
                        options.error([], err.status, err);
                    });

            },

            //promises for crud async operation, being removed as resolve.
            _crudPromises: [],

            //Does not support read.
            //operation: function(data), called on this.
            _crud: function (type, data, options, operation) {
                var that = this,
                    //TODO: replace deferred with revealing constructor pattern, as shown here: http://pouchdb.com/2015/05/18/we-have-a-problem-with-promises.html 
                    deferred = new $.Deferred(),
                    crudPromise = deferred.promise(),
                    resolveCrudDeferred = function () {
                        deferred.resolve();
                        var index = that._crudPromises.indexOf(crudPromise);
                        that._crudPromises.splice(index, 1);
                    };

                this._crudPromises.push(crudPromise);

                operation.call(this, data)
                    .then(function (response) {
                        data._rev = response.rev;
                        options.success(data);
                        resolveCrudDeferred();
                    })
                    .catch(function (err) {
                        if (err.status === 409) {
                            //TODO: conflict resolution
                            console.log(kendo.format("kendo-pouchdb: conflict occured for {0}: {1}", type, err));
                        }
                        options.error([], err.status, err); //TODO: first parameter seems to be err
                        resolveCrudDeferred();
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
            _getFieldViewAndDirForSort: function (sort) {
                var field, descending, fieldView, defaultView = this.defaultView;

                if (!sort || sort.length === 0) {
                    return { fieldView: defaultView, descending: false };
                }
                if (sort.length > 1) {
                    throw new Error("Sorting by multiple fields is not supported by kendo-pouchdb");
                }
                field = sort[0].field;
                descending = sort[0].dir && sort[0].dir === "desc";

                if (field === "_id" || field === this.idField) {
                    return { fieldView: defaultView, descending: descending };
                }

                fieldView = this.fieldViews[field];

                if (!fieldView) {
                    throw new Error("No PouchDB view provided for sorting by '" + field + "'");
                }

                return { fieldView: fieldView, descending: descending };
            },

            _validateFilter: function (filter, sort) {
                //TODO: validate what is possible with db.filter().
            },

            _getFilterQueryOptions: function (filter) {
                if (!filter || filter.filters.length === 0) {
                    return undefined;
                }

                var filterField = filter.filters[0].field,
                    filterOperator = filter.filters[0].operator,
                    filterValue = (filterField === this.idField || filterField === "_id") ? pouchCollate.toIndexableString(filter.filters[0].value) : filter.filters[0].value;

                if (["neq", "gt"].indexOf(filterOperator) >= 0) {
                    throw new Error(kendo.format("{0} operator is currently not supported for field '{1}'", filterOperator, filterField));
                }

                switch (filterOperator) {
                case "eq":
                    return { key: filterValue };
                case "lt":
                    return { endkey: filterValue, inclusive_end: false };
                case "lte":
                    return { endkey: filterValue, inclusive_end: true };
                case "gte":
                    return { startkey: filterValue };
                }
                return undefined;
            },

            //returns selector configuration object to use with db.find()
            _filterToSelector: function (filter, sort) {
                filter = filter || {};
                var that = this,
                    result = {},
                    logic = filter.logic || "and",
                    filters = filter.filters || [],
                    combinationOperator = logic === "and" ? "$and" : "$or",
                    conditions = [],
                    convertOperator = function (operator) {
                        switch (operator) {
                        case "eq":
                            return "$eq";
                        case "neq":
                            return "$ne";
                        case "lt":
                            return "$lt";
                        case "lte":
                            return "$lte";
                        case "gt":
                            return "$gt";
                        case "gte":
                            return "$gte";
                        //case "startswith":
                        //    return "";//TODO: use $regex
                        //case "endswith":
                        //    return "";//TODO: use $regex
                        //case "contains":
                        //    return "";//TODO: use $regex
                        default:
                            throw new Error(kendo.format("Operator {0} is not supported by kendo-pouchdb", operator));
                        }
                    };

                $.each(filters, function (index, filter) {
                    var field = filter.field,
                        value = filter.value,
                        operator,
                        condition,
                        argument;

                    if (filter.filters) {
                        condition = that._filterToSelector(filter, sort);
                    } else {
                        condition = {};
                        operator = convertOperator(filter.operator);
                        argument = {};
                        argument[operator] = value;
                        condition[field] = argument;
                    }

                    conditions.push(condition);
                });

                if (conditions.length === 0) {
                    return null;
                }

                result[combinationOperator] = conditions;

                return result;
            }

        });

        var pouchdbSchema = {
            type: "json",
            data: function (data) {
                if (data.rows) {
                    var docs = $.map(data.rows, function (row) {
                        if (row.doc._id.indexOf("_design/") !== 0) { //ignore design documents
                            return row.doc;
                        }
                        return undefined;
                    });
                    return docs;
                }
                return data;
            },
            total: function (data) {
                return data.total_rows;
            }
        };

        $.extend(true, kendo.data, {
            schemas: {
                pouchdb: pouchdbSchema
            },
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
                        dataSource: this
                    };

                }

                kendo.data.DataSource.fn.init.apply(this, arguments);
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