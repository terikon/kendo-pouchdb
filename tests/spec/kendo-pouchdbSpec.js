/* global kendo,PouchDB */

describe("kendo-pouchdb", function () {

    var db;

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
                            idFactory: "myId"
                        }
                    }

                });
            };

            it("should throw error", function () {
                expect(createDatasource).toThrowError(/The "db" option/);
            });

        });

        describe("no idFactory provided", function () {

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
                expect(createDatasource).toThrowError(/The "idFactory" option/);
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
                                idFactory: function (data) {
                                    return data.myId;
                                }
                            }
                        }

                    });
                };

                it("should throw error", function () {
                    expect(createDatasource).toThrowError(/The model.id option/);
                });

            });

        });

        describe("db and idFactory provided and model.id not provided", function () {

            var createDatasource = function () {
                datasource = new kendo.data.PouchableDataSource({
                    type: "pouchdb",

                    transport: {
                        pouchdb: {
                            db: db,
                            idFactory: function (data) {
                                return data.myId;
                            }
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
                            idFactory: function (data) {
                                return data.myId;
                            }
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
                    expect(createDatasource).toThrowError(/should be "_id"/); //TODO: specify what error
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

    });

    describe("CRUD operations", function () {

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
                        idFactory: "myId"
                    }
                }

            });

            pushSpy = testHelper.spyKendoEvent(datasource, "push");
            changeSpy = testHelper.spyKendoEvent(datasource, "change");

        });

        describe("push CRUD operations", function () {

            beforeEach(function (done) {
                datasource.fetch().then(done);
            });

            describe("putting a document to PouchDB", function () {

                var doc = {
                    _id: pouchCollate.toIndexableString(3),
                    myId: 3,
                    name: "Vasya",
                    age: 5,
                    birthDate: new Date(2015, 4, 1),
                    male: true
                };

                beforeEach(function (done) {
                    var dbChangePromise = testHelper.waitForDbChanges(db, 1),
                        putPromise = db.put(doc);

                    $.when(dbChangePromise, putPromise).then(done);
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

                            $.when(dbChangePromise, putPromise).then(done);
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

                            $.when(dbChangePromise, putPromise).then(done);
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

                    dbChangePromise = testHelper.waitForDbChanges(db, 10),
                    bulkDocsPromise = db.bulkDocs(docs);

                $.when(bulkDocsPromise, dbChangePromise).then(done);
            });

            describe("fetching data from PouchDB with 10 rows", function () {

                beforeEach(function (done) {
                    datasource.fetch().then(done);
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

                        $.when(dbChangePromise, syncPromise).then(done);
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

                        $.when(dbChangePromise, syncPromise).then(done);
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

                        $.when(dbChangePromise, syncPromise).then(done);
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

    describe("operations", function () {

        var datasource,
            pushSpy,
            changeSpy,
            createDataSource = function (idColumn, fieldViews) {
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
                            idFactory: idColumn,
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

                        $.when(dbChangePromise, syncPromise).then(done);
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

                        $.when(dbChangePromise, syncPromise).then(done);
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

        describe("sorting", function () {

            var addRowsAndSort = function (rows, field, dir) {
                    var dbChangePromise = testHelper.waitForDbChanges(db, 3);
                    pushSpy.reset();

                    testHelper.addArrayToDataSource(datasource, rows);

                    datasource.sort({ field: field, dir: dir });

                    var syncPromise = datasource.sync();

                    return $.when(dbChangePromise, syncPromise);
                },
                addIndex = function (indexName, viewName, field) {
                    var ddoc = {
                        _id: '_design/' + indexName,
                        views: {}
                    };
                    ddoc.views[viewName] = {
                        map: "function (doc) { emit(doc['" + field + "']); }"
                    };
                    return db.put(ddoc);
                };

            describe("if sorting by field without index", function () {

                var sort = function () { datasource.sort({ field: "name", dir: "asc" }); };

                beforeEach(function () {
                    datasource = createDataSource("passport");
                });

                it("should fail", function () {
                    expect(sort).toThrowError(); //TODO: specify what error
                });

            });

            describe("by string field", function () {

                var rows;

                beforeEach(function (done) {

                    datasource = createDataSource("passport", //Will be sorted by id by default
                    {
                        "name": "sort/byName"
                    });

                    pushSpy = testHelper.spyKendoEvent(datasource, "push");
                    changeSpy = testHelper.spyKendoEvent(datasource, "change");

                    rows = [
                        createDatasourceDoc(1, "C"),
                        createDatasourceDoc(2, "A"),
                        createDatasourceDoc(3, "B")
                    ];

                    addIndex("sort", "byName", "name").then(done);

                });

                describe("sorting ascending", function () {

                    beforeEach(function (done) {
                        addRowsAndSort(rows, "name", "asc").then(done);
                    });

                    it("should get rows sorted asc", function () {
                        expect(datasource.at(0).name).toBe("A");
                        expect(datasource.at(1).name).toBe("B");
                        expect(datasource.at(2).name).toBe("C");
                    });

                });

                describe("sorting descending", function () {

                    beforeEach(function (done) {
                        addRowsAndSort("desc").then(done);
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

                    datasource = createDataSource("name", //Will be sorted by id by default.
                    {
                        "passport": "sort/byPassport"
                    });

                    pushSpy = testHelper.spyKendoEvent(datasource, "push");
                    changeSpy = testHelper.spyKendoEvent(datasource, "change");

                    rows = [
                        createDatasourceDoc(3, "A"),
                        createDatasourceDoc(1, "B"),
                        createDatasourceDoc(2, "C")
                    ];

                    addIndex("sort", "byPassport", "passport").then(done);

                });

                describe("sorting ascending", function () {

                    beforeEach(function (done) {
                        addRowsAndSort(rows, "passport", "asc").then(done);
                    });

                    it("should get rows sorted asc", function () {
                        expect(datasource.at(0).passport).toBe(1);
                        expect(datasource.at(1).passport).toBe(2);
                        expect(datasource.at(2).passport).toBe(3);
                    });

                });

                describe("sorting descending", function () {

                    beforeEach(function (done) {
                        addRowsAndSort(rows, "passport", "desc").then(done);
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

    });

});