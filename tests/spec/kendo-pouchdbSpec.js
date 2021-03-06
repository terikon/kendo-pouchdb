﻿/* global kendo,PouchDB */

describe("kendo-pouchdb", function () {

    var db, queryPlugins = ["mapreduce", "pouchdb-find"];

    beforeEach(function (done) {
        new PouchDB('testdb')
            .then(function (dbToDestroy) {
                return dbToDestroy.destroy();
            })
            .then(function () {
                return new PouchDB('testdb').then(function (createdDb) {
                    db = createdDb;
                    done();
                });
            })
            .catch(function (error) {
                console.log("PouchDB database creation error:" + error.message);
            });
    });

    var createFindIndex = function (fields) {
        return db.createIndex({
            index: {
                fields: fields
            }
        });
    };

    describe("original methods of kendo.data.DataSource", function () {

        it("create() should be preserved", function () {
            expect(typeof kendo.data.PouchableDataSource.create).toBe("function");
        });

    });

    describe("validation of creation parameters", function () {

        var datasource;

        describe("no db provided", function () {

            var createDatasource = function () {
                datasource = new kendo.data.PouchableDataSource({
                    type: "pouchdb",

                    transport: {
                        pouchdb: {
                            idField: "myId"
                        }
                    }

                });
            };

            it("should throw error", function () {
                expect(createDatasource).toThrowError(/The "db" option/);
            });

        });

        describe("no idField provided", function () {

            var createDatasource = function () {
                datasource = new kendo.data.PouchableDataSource({
                    type: "pouchdb",

                    transport: {
                        pouchdb: {
                            db: db
                        }
                    }

                });
            };

            it("should throw error", function () {
                expect(createDatasource).toThrowError(/The "idField" option/);
            });

        });

        describe("schema provided as config object", function () {

            describe("incorrect model.id provided", function () {

                var createDatasource = function () {
                    datasource = new kendo.data.PouchableDataSource({
                        type: "pouchdb",

                        schema: {
                            model: {
                                id: "myId"
                            }
                        },

                        transport: {
                            pouchdb: {
                                db: db,
                                idField: "myId"
                            }
                        }

                    });
                };

                it("should throw error", function () {
                    expect(createDatasource).toThrowError(/The model.id option/);
                });

            });

        });

        describe("db and idField provided and model.id not provided", function () {

            var createDatasource = function () {
                datasource = new kendo.data.PouchableDataSource({
                    type: "pouchdb",

                    transport: {
                        pouchdb: {
                            db: db,
                            idField: "myId"
                        }
                    }

                });
            };

            it("should not throw error", function () {
                expect(createDatasource).not.toThrowError();
            });

        });

        describe("schema model provided as Model class", function () {

            var createDatasourceForModel = function (Model) {
                datasource = new kendo.data.PouchableDataSource({
                    type: "pouchdb",

                    schema: {
                        model: Model
                    },

                    transport: {
                        pouchdb: {
                            db: db,
                            idField: "myId"
                        }
                    }

                });
            };

            describe("Model has no model id", function () {

                var Model = kendo.data.Model.define({
                    fields: {
                        name: { type: "string" }
                    }
                });

                it("should throw error", function () {
                    var createDatasource = function () {
                        createDatasourceForModel(Model);
                    };
                    expect(createDatasource).toThrowError(/should be "_id"/);
                });

            });

            describe("Model has model id, and it's '_id'", function () {

                var Model = kendo.data.Model.define({
                    id: "_id",

                    fields: {
                        name: { type: "string" }
                    }
                });

                it("should not throw error", function () {
                    var createDatasource = function () {
                        createDatasourceForModel(Model);
                    };
                    expect(createDatasource).not.toThrowError();
                });

            });

        });

        describe("queryPlugin", function () {

            var createDatasource = function (queryPlugin) {
                datasource = new kendo.data.PouchableDataSource({
                    type: "pouchdb",

                    schema: {
                        model: {
                            id: "_id",

                            fields: {
                                name: { type: "string" }
                            }
                        }
                    },

                    transport: {
                        pouchdb: {
                            db: db,
                            idField: "myId",
                            queryPlugin: queryPlugin
                        }
                    }

                });
            };

            describe("incorrect queryPlugin provided", function () {

                it("should throw error", function () {
                    expect(function () {
                        createDatasource("incorrect_plugin");
                    }).toThrowError(/not supported as queryPlugin/);
                });

            });

            describe("correct queryPlugin provided", function () {

                it("should not throw error", function () {
                    expect(function () {
                        createDatasource("pouchdb-find");
                    }).not.toThrowError();
                });

            });

        });

    });

    $.each(queryPlugins, function (__, queryPlugin) {

        describe("CRUD operations with " + queryPlugin, function () {

            var datasource, pushSpy, changeSpy;

            beforeEach(function () {

                datasource = new kendo.data.PouchableDataSource({
                    type: "pouchdb",

                    schema: {
                        model: {
                            fields: {
                                "myId": { type: "number" },
                                "name": { type: "string" },
                                "age": { type: "number" },
                                "birthDate": { type: "date" },
                                "male": { type: "boolean" }
                            }
                        }
                    },

                    transport: {
                        pouchdb: {
                            db: db,
                            idField: "myId",
                            queryPlugin: queryPlugin
                        }
                    }

                });

                pushSpy = testHelper.spyKendoEvent(datasource, "push");
                changeSpy = testHelper.spyKendoEvent(datasource, "change");

            });

            describe("push CRUD operations", function () {

                var doc;

                beforeEach(function (done) {
                    datasource.fetch().then(done).fail(done.fail);

                    doc = {
                        _id: pouchCollate.toIndexableString(3),
                        myId: 3,
                        name: "Vasya",
                        age: 5,
                        birthDate: new Date(2015, 4, 1),
                        male: true
                    };
                });

                describe("putting a document to PouchDB", function () {

                    beforeEach(function (done) {
                        var dbChangePromise = testHelper.waitForDbChanges(db, 1),
                            putPromise = db.put(doc);

                        $.when(dbChangePromise, putPromise).then(done).fail(done.fail);
                    });

                    it("should push create to datasourse", function () {
                        expect(pushSpy.events.length).toEqual(1);
                        expect(pushSpy.events[0].e.type).toEqual("create");
                        expect(pushSpy.events[0].e.items.length).toEqual(1);
                        var item = pushSpy.events[0].e.items[0];
                        expect(item._id).toBe(pouchCollate.toIndexableString(3));
                        expect(item.myId).toBe(3);
                        expect(item.age).toBe(doc.age);
                        expect(item.birthDate).toEqual(doc.birthDate);
                    });

                    describe("and updating in PouchDb", function () {

                        beforeEach(function (done) {
                            pushSpy.reset();
                            db.get(doc._id).then(function (doc2Update) {

                                doc2Update.age = 10;

                                var dbChangePromise = testHelper.waitForDbChanges(db, 1),
                                    putPromise = db.put(doc2Update);

                                $.when(dbChangePromise, putPromise).then(done).fail(done.fail);
                            });

                        });

                        it("should push update to datasourse", function () {
                            expect(pushSpy.events.length).toEqual(1);
                            expect(pushSpy.events[0].e.type).toEqual("update");
                            expect(pushSpy.events[0].e.items.length).toEqual(1);
                            var item = pushSpy.events[0].e.items[0];
                            expect(item._id).toBe(pouchCollate.toIndexableString(3));
                            expect(item.age).toBe(10);
                        });

                    });

                    describe("and deleting in PouchDb", function () {

                        beforeEach(function (done) {
                            pushSpy.reset();
                            db.get(doc._id).then(function (doc2Delete) {

                                doc2Delete._deleted = true;

                                var dbChangePromise = testHelper.waitForDbChanges(db, 1),
                                    putPromise = db.put(doc2Delete);

                                $.when(dbChangePromise, putPromise).then(done).fail(done.fail);
                            });

                        });

                        it("should push destroy to datasourse", function () {
                            expect(pushSpy.events.length).toEqual(1);
                            expect(pushSpy.events[0].e.type).toEqual("destroy");
                            expect(pushSpy.events[0].e.items.length).toEqual(1);
                            var item = pushSpy.events[0].e.items[0];
                            expect(item._id).toBe(pouchCollate.toIndexableString(3));
                        });

                    });

                });

            });

            describe("datasource CRUD operations", function () {

                var createDatasourceDoc = function (id, name) {
                        return {
                            myId: id,
                            //here _id should be undefined
                            name: name,
                            age: 5,
                            birthDate: new Date(2015, 4, 1),
                            male: true
                        };
                    },
                    createDbDoc = function (id, name) {
                        var doc = createDatasourceDoc(id, name);
                        doc._id = pouchCollate.toIndexableString(id);
                        return doc;
                    };

                beforeEach(function (done) {
                    var docs = _.map(_.range(10), function (num) {
                            return createDbDoc(num, "Vasya" + num);
                        }),

                        dbChangePromise = testHelper.waitForDbChanges(db, docs.length),
                        bulkDocsPromise = db.bulkDocs(docs);

                    $.when(bulkDocsPromise, dbChangePromise).then(done).fail(done.fail);
                });

                describe("fetching data from PouchDB with 10 rows", function () {

                    beforeEach(function (done) {
                        datasource.fetch().then(done).fail(done.fail);
                    });

                    it("should fetch 10 rows", function () {
                        expect(datasource.total()).toEqual(10);
                        expect(datasource.at(0)._id).toBe(pouchCollate.toIndexableString(0));
                        expect(datasource.at(0).myId).toBe(0);
                        expect(datasource.at(0).name).toEqual("Vasya0");
                    });

                    describe("and adding a row to datasource", function () {

                        var newDoc;

                        beforeEach(function (done) {
                            //For kendo DataSource new row is row which has row.id==row._defaultId. id is set to row.get(row.idField).
                            newDoc = createDatasourceDoc(100, "Added to datasource");

                            var dbChangePromise = testHelper.waitForDbChanges(db, 1);
                            pushSpy.reset();

                            datasource.add(newDoc);
                            var syncPromise = datasource.sync();

                            $.when(dbChangePromise, syncPromise).then(done).fail(done.fail);
                        });

                        it("should add the row to PouchDB", function (done) {
                            db.get(pouchCollate.toIndexableString(100)).then(function (doc) {
                                expect(doc).toBeTruthy();
                                expect(doc.myId).toBe(100);
                                done();
                            }).catch(function (err) {
                                console.log("ERR:" + err);
                            });
                        });

                        it("should not cause push event back to datasource", function () {
                            expect(pushSpy.events.length).toEqual(0);
                        });

                        it("should assign _rev to row of datasource", function () {
                            var newModel = datasource.get(pouchCollate.toIndexableString(100));
                            expect(newModel._rev).toBeTruthy();
                        });

                    });

                    describe("and updating a row to datasource", function () {

                        var kendoRow;

                        beforeEach(function (done) {

                            kendoRow = datasource.get(pouchCollate.toIndexableString(5));

                            var dbChangePromise = testHelper.waitForDbChanges(db, 1);
                            pushSpy.reset();

                            kendoRow.set('name', "Changed in datasource");
                            var syncPromise = datasource.sync();

                            $.when(dbChangePromise, syncPromise).then(done).fail(done.fail);
                        });

                        it("should update the row in PouchDB", function (done) {
                            db.get(pouchCollate.toIndexableString(5)).then(function (doc) {
                                expect(doc.name).toEqual(kendoRow.name);
                                done();
                            }).catch(function (err) {
                                console.log("ERR:" + err);
                            });
                        });

                        it("should not cause push event back to datasource", function () {
                            expect(pushSpy.events.length).toEqual(0);
                        });

                        it("should update _rev in row of datasource", function (done) {
                            db.get(pouchCollate.toIndexableString(5)).then(function (doc) {
                                expect(kendoRow._rev).toEqual(doc._rev);
                                done();
                            }).catch(function (err) {
                                console.log("ERR:" + err);
                            });
                        });

                    });

                    describe("and deleting a row from datasource", function () {

                        var kendoRow;

                        beforeEach(function (done) {

                            kendoRow = datasource.get(pouchCollate.toIndexableString(5));

                            var dbChangePromise = testHelper.waitForDbChanges(db, 1);
                            pushSpy.reset();

                            datasource.remove(kendoRow);
                            var syncPromise = datasource.sync();

                            $.when(dbChangePromise, syncPromise).then(done).fail(done.fail);
                        });

                        it("should delete the row in PouchDB", function (done) {
                            db.get(pouchCollate.toIndexableString(5)).catch(function (err) {
                                if (err.status === 404) {
                                    expect(true).toBe(true); //TODO: How to pass a test in jasmine?
                                    done();
                                } else {
                                    console.log("ERR:" + err);
                                }
                            });
                        });

                        it("should not cause push event back to datasource", function () {
                            expect(pushSpy.events.length).toEqual(0);
                        });

                    });

                });

            });

            afterEach(function () {
                pushSpy.dispose();
                changeSpy.dispose();
            });

        });

    });

    describe("operations", function () {

        var datasource,
            pushSpy,
            changeSpy,
            createDataSource = function (idColumn, queryPlugin, fieldViews, defaultView) {
                return new kendo.data.PouchableDataSource({
                    type: "pouchdb",

                    schema: {
                        model: {
                            fields: {
                                "passport": { type: "number" },
                                "name": { type: "string" },
                                "birthDate": { type: "date" }
                            }
                        }
                    },

                    transport: {
                        pouchdb: {
                            db: db,
                            idField: idColumn,
                            queryPlugin: queryPlugin,
                            defaultView: defaultView,
                            fieldViews: fieldViews
                        }
                    }

                });
            },
            createDatasourceDoc = function (passport, name, birthDate) {
                return {
                    //here _id should be undefined
                    passport: passport,
                    name: name,
                    birthDate: birthDate || new Date(2015, 4, 1)
                };
            },
            createDbDoc = function (idField, passport, name, birthDate) {
                var doc = createDatasourceDoc(passport, name, birthDate);
                doc._id = pouchCollate.toIndexableString(doc[idField]);
                return doc;
            },
            addIndex = function (queryPlugin, indexName, viewName, field) {
                if (queryPlugin === "mapreduce") {
                    var ddoc = {
                        _id: '_design/' + indexName,
                        views: {}
                    };
                    ddoc.views[viewName] = {
                        map: "function (doc) { emit(doc['" + field + "']); }"
                    };
                    return db.put(ddoc);
                } else if (queryPlugin === "pouchdb-find") {
                    return createFindIndex([field]);
                }
            };

        describe("collation", function () {

            describe("string as id", function () {

                beforeEach(function () {

                    datasource = createDataSource("name");

                    pushSpy = testHelper.spyKendoEvent(datasource, "push");
                    changeSpy = testHelper.spyKendoEvent(datasource, "change");

                });

                describe("adding few rows to datasource", function () {

                    beforeEach(function (done) {
                        var rows = [
                            createDatasourceDoc(1, "C"),
                            createDatasourceDoc(2, "A"),
                            createDatasourceDoc(3, "B")
                        ];

                        var dbChangePromise = testHelper.waitForDbChanges(db, 3);
                        pushSpy.reset();

                        testHelper.addArrayToDataSource(datasource, rows);

                        var syncPromise = datasource.sync();

                        $.when(dbChangePromise, syncPromise).then(done).fail(done.fail);
                    });

                    it("should add rows to PouchDB sorted by id", function (done) {
                        db.allDocs({ include_docs: true })
                            .then(function (result) {
                                var resultRows = $.map(result.rows, function (row) {
                                    return row.doc;
                                });
                                expect(resultRows[0].name).toBe("A");
                                expect(resultRows[1].name).toBe("B");
                                expect(resultRows[2].name).toBe("C");
                                done();
                            });
                    });

                });

                afterEach(function () {
                    pushSpy.dispose();
                    changeSpy.dispose();
                });

            });

            describe("number as id", function () {

                beforeEach(function () {

                    datasource = createDataSource("passport");

                    pushSpy = testHelper.spyKendoEvent(datasource, "push");
                    changeSpy = testHelper.spyKendoEvent(datasource, "change");

                });

                describe("adding few rows to datasource", function () {

                    beforeEach(function (done) {
                        var rows = [
                            createDatasourceDoc(15, "A"),
                            createDatasourceDoc(2, "B"),
                            createDatasourceDoc(120, "C")
                        ];

                        var dbChangePromise = testHelper.waitForDbChanges(db, 3);
                        pushSpy.reset();

                        testHelper.addArrayToDataSource(datasource, rows);

                        var syncPromise = datasource.sync();

                        $.when(dbChangePromise, syncPromise).then(done).fail(done.fail);
                    });

                    it("should add rows to PouchDB sorted by id", function (done) {
                        db.allDocs({ include_docs: true })
                            .then(function (result) {
                                var resultRows = $.map(result.rows, function (row) {
                                    return row.doc;
                                });
                                expect(resultRows[0].passport).toBe(2);
                                expect(resultRows[1].passport).toBe(15);
                                expect(resultRows[2].passport).toBe(120);
                                done();
                            });
                    });

                });

                afterEach(function () {
                    pushSpy.dispose();
                    changeSpy.dispose();
                });

            });

        });

        describe("sorting and filtering", function () {

            var addRowsAndSort = function (rows, field, dir) {
                var dbChangePromise = testHelper.waitForDbChanges(db, rows.length);
                pushSpy.reset();

                testHelper.addArrayToDataSource(datasource, rows);

                datasource.sort({ field: field, dir: dir });

                var syncRefetchPromise = datasource.sync()
                    .then(function () {
                        return datasource.fetch();
                    });

                return $.when(dbChangePromise, syncRefetchPromise);
            };

            $.each(queryPlugins, function (__, queryPlugin) {

                describe("sorting with " + queryPlugin, function () {

                    if (queryPlugin === "mapreduce") {

                        describe("if sorting by field without index", function () {

                            var sort = function () { datasource.sort({ field: "name", dir: "asc" }); };

                            beforeEach(function () {
                                datasource = createDataSource("passport", "mapreduce");
                            });

                            it("should fail", function () {
                                expect(sort).toThrowError(/No PouchDB view/);
                            });

                        });

                        describe("if sorting by more than one field", function () {

                            var sort = function () {
                                datasource.sort(
                                [
                                    { field: "name", dir: "asc" },
                                    { field: "passport", dir: "asc" }
                                ]);
                            };

                            beforeEach(function () {
                                datasource = createDataSource("passport", "mapreduce");
                            });

                            it("should fail", function () {
                                expect(sort).toThrowError(/multiple fields/);
                            });

                        });

                    }

                    describe("by string field", function () {

                        var rows;

                        beforeEach(function (done) {

                            var fieldViews = (queryPlugin === "mapreduce") ?
                                {
                                    "name": "sort/byName" //Will be sorted by id by default
                                }
                                : undefined;

                            datasource = createDataSource("passport", queryPlugin, fieldViews);

                            pushSpy = testHelper.spyKendoEvent(datasource, "push");
                            changeSpy = testHelper.spyKendoEvent(datasource, "change");

                            rows = [
                                createDatasourceDoc(1, "C"),
                                createDatasourceDoc(2, "A"),
                                createDatasourceDoc(3, "B")
                            ];

                            addIndex(queryPlugin, "sort", "byName", "name").then(done).catch(done.fail);

                        });

                        describe("sorting ascending", function () {

                            beforeEach(function (done) {
                                addRowsAndSort(rows, "name", "asc").then(done).fail(done.fail);
                            });

                            it("should get rows sorted asc", function () {
                                expect(datasource.at(0).name).toBe("A");
                                expect(datasource.at(1).name).toBe("B");
                                expect(datasource.at(2).name).toBe("C");
                            });

                        });

                        describe("sorting descending", function () {

                            beforeEach(function (done) {
                                addRowsAndSort(rows, "name", "desc").then(done).fail(done.fail);
                            });

                            it("should get rows sorted desc", function () {
                                expect(datasource.at(0).name).toBe("C");
                                expect(datasource.at(1).name).toBe("B");
                                expect(datasource.at(2).name).toBe("A");
                            });

                        });

                        afterEach(function () {
                            pushSpy.dispose();
                            changeSpy.dispose();
                        });

                    });

                    describe("by number field", function () {

                        var rows;

                        beforeEach(function (done) {

                            var fieldViews = (queryPlugin === "mapreduce") ?
                                {
                                    "passport": "sort/byPassport" //Will be sorted by id by default
                                }
                                : undefined;

                            datasource = createDataSource("name", queryPlugin, fieldViews);

                            pushSpy = testHelper.spyKendoEvent(datasource, "push");
                            changeSpy = testHelper.spyKendoEvent(datasource, "change");

                            rows = [
                                createDatasourceDoc(3, "A"),
                                createDatasourceDoc(1, "B"),
                                createDatasourceDoc(2, "C")
                            ];

                            addIndex(queryPlugin, "sort", "byPassport", "passport").then(done).catch(done.fail);

                        });

                        describe("sorting ascending", function () {

                            beforeEach(function (done) {
                                addRowsAndSort(rows, "passport", "asc").then(done).fail(done.fail);
                            });

                            it("should get rows sorted asc", function () {
                                expect(datasource.at(0).passport).toBe(1);
                                expect(datasource.at(1).passport).toBe(2);
                                expect(datasource.at(2).passport).toBe(3);
                            });

                            describe("with paging", function () {

                                beforeEach(function (done) {
                                    datasource.pageSize(2);
                                    datasource.page(2);
                                    datasource.fetch().then(done).fail(done.fail);
                                });

                                it("total should be as without paging", function () {
                                    expect(datasource.total()).toBe(3);
                                });

                                it("should return paged rows", function () {
                                    var view = datasource.view();
                                    expect(view.length).toBe(1);
                                    expect(view[0].passport).toBe(3);
                                });

                            });

                        });

                        describe("sorting descending", function () {

                            beforeEach(function (done) {
                                addRowsAndSort(rows, "passport", "desc").then(done).fail(done.fail);
                            });

                            it("should get rows sorted desc", function () {
                                expect(datasource.at(0).passport).toBe(3);
                                expect(datasource.at(1).passport).toBe(2);
                                expect(datasource.at(2).passport).toBe(1);
                            });

                        });

                        afterEach(function () {
                            pushSpy.dispose();
                            changeSpy.dispose();
                        });

                    });

                });

                describe("filtering with " + queryPlugin, function () {

                    describe("by number field", function () {

                        var rows;

                        beforeEach(function (done) {

                            var fieldViews = (queryPlugin === "mapreduce") ?
                                {
                                    "name": "sort/byName" //Will be sorted by id by default
                                }
                                : undefined;

                            datasource = createDataSource("passport", queryPlugin, fieldViews);

                            pushSpy = testHelper.spyKendoEvent(datasource, "push");
                            changeSpy = testHelper.spyKendoEvent(datasource, "change");

                            rows = [
                                createDatasourceDoc(1, "A"),
                                createDatasourceDoc(2, "B"),
                                createDatasourceDoc(3, "C"),
                                createDatasourceDoc(4, "D"),
                                createDatasourceDoc(5, "E")
                            ];

                            addIndex(queryPlugin, "sort", "byName", "name")
                                .then(function () {
                                    return addRowsAndSort(rows, "passport", "asc");
                                })
                                .then(done)
                                .catch(done.fail);

                        });

                        if (queryPlugin === "mapreduce") {

                            describe("array as filter parameter", function () {

                                var fetch = function () {
                                    datasource.filter([{ field: "passport", operator: "eq", value: 3 }, { field: "passport", operator: "eq", value: 4 }]);
                                    datasource.fetch();
                                };

                                it("should throw error not supported", function () {
                                    expect(fetch).toThrowError(/not supported/);
                                });

                            });

                            describe("given filters property of filter", function () {

                                var fetch = function () {
                                    datasource.filter({ logic: "or", filters: [{ field: "passport", operator: "eq", value: 3 }, { field: "passport", operator: "eq", value: 4 }] });
                                    datasource.fetch();
                                };

                                it("should throw error not supported", function () {
                                    expect(fetch).toThrowError(/not supported/);
                                });

                            });

                            describe("given filter that differs from default sort", function () {

                                var fetch = function () {
                                    datasource.filter({ field: "name", operator: "eq", value: "C" });
                                    datasource.fetch();
                                };

                                it("should throw error not supported", function () {
                                    expect(fetch).toThrowError(/not supported/);
                                });

                            });

                            describe("given filter that differs from given sort", function () {

                                beforeEach(function (done) {
                                    datasource.sort({ field: "name", dir: "asc" });
                                    datasource.fetch().then(done).fail(done.fail);
                                });

                                var fetch = function () {
                                    datasource.filter({ field: "passport", operator: "eq", value: 3 });
                                    datasource.fetch();
                                };

                                it("should throw error not supported", function () {
                                    expect(fetch).toThrowError(/not supported/);
                                });

                            });

                        }

                        describe("filter with eq", function () {

                            beforeEach(function (done) {
                                datasource.filter({ field: "passport", operator: "eq", value: 3 });
                                datasource.fetch().then(done).fail(done.fail);
                            });

                            it("should get specified row", function () {
                                var view = datasource.view();
                                expect(view.length).toBe(1);
                                expect(view[0].passport).toBe(3);
                            });

                            it("should get total equal to one", function () {
                                expect(datasource.total()).toBe(1);
                            });

                        });

                        if (queryPlugin !== "mapreduce") { //TODO: add support of neq to mapreduce mode

                            describe("filter with neq", function () {

                                beforeEach(function (done) {
                                    datasource.filter({ field: "passport", operator: "neq", value: 3 });
                                    datasource.fetch().then(done).fail(done.fail);
                                });

                                it("should get specified row", function () {
                                    var view = datasource.view();
                                    expect(view.length).toBe(4);
                                    expect(view[0].passport).toBe(1);
                                    expect(view[1].passport).toBe(2);
                                    expect(view[2].passport).toBe(4);
                                    expect(view[3].passport).toBe(5);
                                });

                                it("should get total equal to one", function () {
                                    expect(datasource.total()).toBe(4);
                                });

                            });

                        }

                        describe("filter with lt", function () {

                            beforeEach(function (done) {
                                datasource.filter({ field: "passport", operator: "lt", value: 3 });
                                datasource.fetch().then(done).fail(done.fail);
                            });

                            it("should get specified rows", function () {
                                var view = datasource.view();
                                expect(view.length).toBe(2);
                                expect(view[0].passport).toBe(1);
                                expect(view[1].passport).toBe(2);
                            });

                            it("should get total equal to rows in filter", function () {
                                expect(datasource.total()).toBe(2);
                            });

                        });

                        describe("filter with lte", function () {

                            beforeEach(function (done) {
                                datasource.filter({ field: "passport", operator: "lte", value: 3 });
                                datasource.fetch().then(done).fail(done.fail);
                            });

                            it("should get specified rows", function () {
                                var view = datasource.view();
                                expect(view.length).toBe(3);
                                expect(view[0].passport).toBe(1);
                                expect(view[1].passport).toBe(2);
                                expect(view[2].passport).toBe(3);
                            });

                            it("should get total equal to rows in filter", function () {
                                expect(datasource.total()).toBe(3);
                            });

                            describe("with paging", function () {

                                beforeEach(function (done) {
                                    datasource.pageSize(2);
                                    datasource.page(2);
                                    datasource.fetch().then(done).fail(done.fail);
                                });

                                it("total should be as without paging", function () {
                                    expect(datasource.total()).toBe(3);
                                });

                                it("should return paged rows", function () {
                                    var view = datasource.view();
                                    expect(view.length).toBe(1);
                                    expect(view[0].passport).toBe(3);
                                });

                            });

                        });

                        describe("filter with gte", function () {

                            beforeEach(function (done) {
                                datasource.filter({ field: "passport", operator: "gte", value: 3 });
                                datasource.fetch().then(done).fail(done.fail);
                            });

                            it("should get specified rows", function () {
                                var view = datasource.view();
                                expect(view.length).toBe(3);
                                expect(view[0].passport).toBe(3);
                                expect(view[1].passport).toBe(4);
                                expect(view[2].passport).toBe(5);
                            });

                            it("should get total equal to rows in filter", function () {
                                expect(datasource.total()).toBe(3);
                            });

                        });

                        afterEach(function () {
                            pushSpy.dispose();
                            changeSpy.dispose();
                        });

                    });

                });

            });

        });

        $.each(queryPlugins, function (__, queryPlugin) {

            describe("paging with " +queryPlugin, function () {

                var rows;

                beforeEach(function (done) {
                    datasource = createDataSource("passport", queryPlugin);
                    rows = [
                        createDatasourceDoc(1, "A"),
                        createDatasourceDoc(2, "B"),
                        createDatasourceDoc(3, "C"),
                        createDatasourceDoc(4, "D"),
                        createDatasourceDoc(5, "E")
                    ];
                    var dbChangePromise = testHelper.waitForDbChanges(db, rows.length);
                    testHelper.addArrayToDataSource(datasource, rows);

                    var syncPromise = datasource.sync();

                    $.when(dbChangePromise, syncPromise).then(done).fail(done.fail);
                });

                describe("page in the middle", function () {

                    beforeEach(function (done) {
                        datasource.pageSize(2);
                        datasource.page(2);
                        datasource.fetch().then(done).fail(done.fail);
                    });

                    it("should fetch pageSize items", function () {
                        var view = datasource.view();
                        expect(view.length).toBe(2);
                        expect(view[0].passport).toBe(3);
                        expect(view[1].passport).toBe(4);
                    });

                    it("total() still should return correct number", function () {
                        expect(datasource.total()).toBe(5);
                    });

                    describe("where there are design documents", function () {

                        beforeEach(function (done) {
                            addIndex(queryPlugin, "sort", "byName", "name")
                                .then(function () {
                                    return datasource.fetch();
                                })
                                .then(done)
                                .catch(done.fail);
                        });

                        it("total() still should return correct number", function () {
                            expect(datasource.total()).toBe(5);
                        });

                    });

                    describe("updating a document in PouchDB ", function () {

                        //returns promise
                        var updateDocNameInDb = function (id) {
                            return db.get(pouchCollate.toIndexableString(id)).then(function (doc2Update) {

                                doc2Update.name += "updated";

                                var dbChangePromise = testHelper.waitForDbChanges(db, 1),
                                    putPromise = db.put(doc2Update);

                                return $.when(dbChangePromise, putPromise);
                            });
                        };

                        beforeEach(function () {
                            pushSpy = testHelper.spyKendoEvent(datasource, "push");
                            changeSpy = testHelper.spyKendoEvent(datasource, "change");
                        });

                        describe("that in range", function () {

                            beforeEach(function (done) {
                                updateDocNameInDb(3).then(done).catch(done.fail);
                            });

                            it("should push update to datasourse", function () {
                                expect(pushSpy.events.length).toEqual(1);
                                expect(pushSpy.events[0].e.type).toEqual("update");
                                var item = pushSpy.events[0].e.items[0];
                                expect(item._id).toBe(pouchCollate.toIndexableString(3));
                            });

                        });

                        describe("that not in range", function () {

                            beforeEach(function (done) {
                                updateDocNameInDb(1).then(done).catch(done.fail);
                            });

                            it("should not push update to datasourse", function () {
                                expect(pushSpy.events.length).toEqual(0);
                            });

                        });

                        afterEach(function () {
                            pushSpy.dispose();
                            changeSpy.dispose();
                        });

                    });

                });

                describe("page in the end", function () {

                    beforeEach(function (done) {
                        datasource.pageSize(2);
                        datasource.page(3);
                        datasource.fetch().then(done).fail(done.fail);
                    });

                    it("should fetch pageSize items", function () {
                        var view = datasource.view();
                        expect(view.length).toBe(1);
                        expect(view[0].passport).toBe(5);
                    });

                });

                describe("in desc order", function () {

                    beforeEach(function (done) {
                        datasource.pageSize(2);
                        datasource.page(2);
                        datasource.sort({ field: "passport", dir: "desc" });
                        datasource.fetch().then(done).fail(done.fail);
                    });

                    it("should fetch pageSize items in opposite order", function () {
                        var view = datasource.view();
                        expect(view.length).toBe(2);
                        expect(view[0].passport).toBe(3);
                        expect(view[1].passport).toBe(2);
                    });

                });

            });

        });

        describe("default view", function () {

            beforeEach(function (done) {

                var docsDontTake = _.map(_.range(3), function (num) { //3 not not take
                        return createDbDoc("passport", num, null);
                    }),
                    docsTake = _.map(_.range(3, 10), function (num) { //7 to take
                        return createDbDoc("passport", num, "Vasya" + num);
                    }),
                    docs = _.shuffle(_.union(
                        docsDontTake,
                        docsTake,
                        [
                            {
                                _id: '_design/people',
                                views: {
                                    withName: {
                                        map: function (doc) {
                                            if (doc.name) {
                                                emit(doc._id);
                                            }
                                        }.toString()
                                    }
                                }
                            }
                        ])),

                    dbChangePromise = testHelper.waitForDbChanges(db, docs.length),
                    bulkDocsPromise = db.bulkDocs(docs);

                datasource = createDataSource("passport", "mapreduce", undefined, 'people/withName');

                $.when(bulkDocsPromise, dbChangePromise).then(done).fail(done.fail);

            });

            describe("when fetched", function () {

                beforeEach(function (done) {
                    datasource.fetch().then(done).fail(done.fail);
                });

                it("should fetch data filtered by view", function () {
                    expect(datasource.total()).toEqual(7);
                    expect(datasource.at(0).passport).toEqual(3);
                    expect(datasource.at(6).passport).toEqual(9);
                });

            });

        });

        describe("error handling", function () {

            var errorSpy;

            beforeEach(function () {

                datasource = createDataSource("name", "mapreduce");
                errorSpy = testHelper.spyKendoEvent(datasource, "error");
            });

            describe("error in fetch", function () {

                beforeEach(function () {
                    spyOn(db, "allDocs").and.returnValue(PouchDB.utils.Promise.reject("simulated PouchDB.allDocs error"));
                });

                it("should raise error event on datasource", function (done) {
                    datasource.fetch().fail(function () {
                        setTimeout(function () {
                            expect(errorSpy.events.length).toEqual(1);
                            expect(errorSpy.events[0].e.errorThrown).toEqual("simulated PouchDB.allDocs error");
                            done();
                        }, 0);
                    });
                });

            });

            describe("error in add", function () {

                beforeEach(function (done) {
                    spyOn(db, "put").and.returnValue(PouchDB.utils.Promise.reject("simulated PouchDB.put error"));
                    datasource.fetch().then(done).fail(done.fail);
                });

                it("should raise error event on datasource", function (done) {
                    datasource.add(createDatasourceDoc(1, "A"));
                    datasource.sync().fail(function () {
                        setTimeout(function () {
                            expect(errorSpy.events.length).toEqual(1);
                            expect(errorSpy.events[0].e.errorThrown).toEqual("simulated PouchDB.put error");
                            done();
                        }, 0);
                    });
                });

            });

            afterEach(function () {
                errorSpy.dispose();
            });

        });

        describe("building find:selector", function () {

            beforeEach(function () {
                datasource = createDataSource("name", "pouchdb-find");
            });

            describe("empty filter, no sort", function () {

                var selector;

                beforeEach(function () {
                    var filter = datasource.filter(),
                        sort = datasource.sort();
                    selector = datasource.transport._kendoFilterToFindSelector(filter, sort);
                });

                it("should return undefined", function () {
                    expect(selector).toBeUndefined();
                });

            });

            describe("simple filter not by id, no sort", function () {

                var selector;

                beforeEach(function () {
                    datasource.filter({ field: "passport", operator: "eq", value: 123 });
                    var filter = datasource.filter(),
                        sort = datasource.sort();
                    selector = datasource.transport._kendoFilterToFindSelector(filter, sort);
                });

                it("should build up appropriate explicit selector", function () {
                    expect(selector).toEqual({
                        "$and": [
                            {
                                "passport": {
                                    "$eq": 123
                                }
                            }
                        ]
                    });
                });

            });

            describe("complex filter by not id and id, no sort", function () {

                var selector;

                beforeEach(function () {
                    datasource.filter({
                        logic: "or",
                        filters: [
                            { field: "name", operator: "eq", value: "Vasya" },
                            { field: "passport", operator: "eq", value: 234 }
                        ]
                    });
                    var filter = datasource.filter(),
                        sort = datasource.sort();

                    selector = datasource.transport._kendoFilterToFindSelector(filter, sort);
                });

                it("should build up appropriate explicit selector", function () {
                    expect(selector).toEqual({
                        "$or": [
                            {
                                "_id": {
                                    "$eq": pouchCollate.toIndexableString("Vasya")
                                }
                            },
                            {
                                "passport": {
                                    "$eq": 234
                                }
                            }
                        ]
                    });
                });

            });

            describe("nested filter, no sort", function () {

                var selector;

                beforeEach(function () {
                    datasource.filter({
                        logic: "or",
                        filters: [
                            { field: "name", operator: "eq", value: "Vasya" },
                            { field: "passport", operator: "eq", value: 234 },
                            {
                                logic: "and",
                                filters: [
                                    { field: "name", operator: "eq", value: "Petya" },
                                    { field: "passport", operator: "eq", value: 456 }
                                ]
                            }
                        ]
                    });
                    var filter = datasource.filter(),
                        sort = datasource.sort();
                    selector = datasource.transport._kendoFilterToFindSelector(filter, sort);
                });

                it("should build up appropriate explicit selector", function () {
                    expect(selector).toEqual({
                        "$or": [
                            {
                                "_id": {
                                    "$eq": pouchCollate.toIndexableString("Vasya")
                                }
                            },
                            {
                                "passport": {
                                    "$eq": 234
                                }
                            }, {
                                "$and": [
                                    {
                                        "_id": {
                                            "$eq": pouchCollate.toIndexableString("Petya")
                                        }
                                    },
                                    {
                                        "passport": {
                                            "$eq": 456
                                        }
                                    }
                                ]
                            }
                        ]
                    });
                });

            });

            describe("sort not by id, without filter", function () {

                var selector;

                beforeEach(function (done) {
                    createFindIndex(["passport"]).then(function () {
                            datasource.sort({ field: "passport", dir: "asc" });
                            return datasource.fetch()
                                .then(function () {
                                    var filter = datasource.filter(),
                                        sort = datasource.sort();
                                    selector = datasource.transport._kendoFilterToFindSelector(filter, sort);
                                    done();
                                });
                        })
                        .catch(done.fail);
                });

                it("should build up appropriate explicit selector", function () {
                    expect(selector).toEqual({
                        "$and": [
                            {
                                "passport": {
                                    "$exists": true
                                }
                            }
                        ]
                    });
                });

            });

            describe("_isIdRangeFilter", function () {
                var result;

                beforeEach(function () {
                    datasource = createDataSource("passport", "pouchdb-find");
                });

                describe("when range _id", function () {

                    beforeEach(function () {
                        datasource.filter({ field: "_id", operator: "eq", value: 123 });
                        var filter = datasource.filter();
                        result = datasource.transport._isIdRangeFilter(filter);
                    });

                    it("should return true", function () {
                        expect(result).toBe(true);
                    });

                });

                describe("when range idColumn", function () {

                    beforeEach(function () {
                        datasource.filter({ field: "passport", operator: "eq", value: 123 });
                        var filter = datasource.filter();
                        result = datasource.transport._isIdRangeFilter(filter);
                    });

                    it("should return true", function () {
                        expect(result).toBe(true);
                    });

                });

                describe("when range not by id", function () {

                    beforeEach(function () {
                        datasource.filter({ field: "name", operator: "eq", value: 123 });
                        var filter = datasource.filter();
                        result = datasource.transport._isIdRangeFilter(filter);
                    });

                    it("should return true", function () {
                        expect(result).toBe(false);
                    });

                });

            });

        });

        describe("building find:sort", function () {

            beforeEach(function () {
                datasource = createDataSource("name", "pouchdb-find");
            });

            describe("no sort", function () {

                var kendoSort, pouchSort;

                beforeEach(function (done) {
                    kendoSort = datasource.sort();
                    datasource.fetch()
                        .then(function () {
                            pouchSort = datasource.transport._kendoSortToFindSort(kendoSort);
                            done();
                        })
                        .fail(done.fail);
                });

                it("should return undefined", function () {
                    expect(pouchSort).toBeUndefined();
                });

            });

            describe("one field sort (id)", function () {

                var kendoSort, pouchSort;

                beforeEach(function (done) {
                    datasource.sort({ field: "name", dir: "asc" });
                    kendoSort = datasource.sort();
                    datasource.fetch()
                        .then(function () {
                            pouchSort = datasource.transport._kendoSortToFindSort(kendoSort);
                            done();
                        })
                        .fail(done.fail);
                });

                it("should return appropriate sort configuration", function () {
                    expect(pouchSort).toEqual([
                        { "_id": "asc" }
                    ]);
                });

            });

            describe("one field sort (id) desc", function () {

                var kendoSort, pouchSort;

                beforeEach(function (done) {
                    datasource.sort({ field: "name", dir: "desc" });
                    kendoSort = datasource.sort();
                    datasource.fetch()
                        .then(function () {
                            pouchSort = datasource.transport._kendoSortToFindSort(kendoSort);
                            done();
                        })
                        .fail(done.fail);
                });

                it("should return appropriate sort configuration", function () {
                    expect(pouchSort).toEqual([
                        { "_id": "desc" }
                    ]);
                });

            });

            describe("multiple field sort", function () {

                var kendoSort, pouchSort;

                beforeEach(function (done) {
                    createFindIndex(["_id", "passport"])
                        .then(function () {
                            datasource.sort([
                                { field: "name", dir: "asc" },
                                { field: "passport", dir: "desc" }
                            ]);
                            return datasource.fetch()
                                .then(function () {
                                    kendoSort = datasource.sort();
                                    pouchSort = datasource.transport._kendoSortToFindSort(kendoSort);
                                    done();
                                });
                        })
                        .catch(done.fail);

                });

                it("should return appropriate sort configuration", function () {
                    expect(pouchSort).toEqual([
                        { "_id": "asc" },
                        { "passport": "desc" }
                    ]);
                });

            });

        });

    });

});