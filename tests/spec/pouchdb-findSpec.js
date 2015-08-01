/* global kendo,PouchDB */

describe("pouchdb-find", function () {

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

    describe("fill datasource with data", function () {

        var createDatasourceDoc = function (num, id, name, debut, series) {
                return {
                    //here _id should be undefined
                    num: num,
                    id: id,
                    name: name,
                    debut: debut,
                    series: series
                };
            },
            createDbDoc = function (idField, num, id, name, debut, series) {
                var doc = createDatasourceDoc(num, id, name, debut, series);
                doc._id = idField === "num" ? pouchCollate.toIndexableString(doc[idField]) : doc[idField];
                return doc;
            },
            docs;

        beforeEach(function (done) {

            docs = [
                createDbDoc("id", 1, "falcon", "Captain Falcon", 1990, "F-Zero"),
                createDbDoc("id", 4, "yoshi", "Yoshi", 1990, "Mario"),
                createDbDoc("id", 3, "fox", "Fox", 1993, "Star Fox"),
                createDbDoc("id", 2, "link", "Link", 1986, "Zelda"),
                createDbDoc("id", 5, "ness", "Ness", 1994, "Earthbound"),
                createDbDoc("id", 12, "kirby", "Kirby", 1992, "Kirby"),
                createDbDoc("id", 11, "luigi", "Luigi", 1983, "Mario"),
                createDbDoc("id", 6, "puff", "Jigglypuff", 1996, "Pokemon"),
                createDbDoc("id", 7, "dk", "Donkey Kong", 1981, "Mario"),
                createDbDoc("id", 9, "samus", "Samus", 1986, "Metroid"),
                createDbDoc("id", 8, "mario", "Mario", 1981, "Mario"),
                createDbDoc("id", 10, "pikachu", "Pikachu", 1996, "Pokemon")
            ];

            var dbChangePromise = testHelper.waitForDbChanges(db, docs.length),
                bulkDocsPromise = db.bulkDocs(docs);

            $.when(bulkDocsPromise, dbChangePromise).then(done);

        });

        describe("operations", function () {

            describe("sort by _id", function () {

                var result;

                beforeEach(function (done) {

                    db.find({
                            //selector: { _id: { $gt: pouchCollate.toIndexableString(4) } },
                            selector: { _id: { $gt: "a" } },
                            sort: ['_id']
                        })
                        .then(function (res) {
                            result = res;
                            done();
                        })
                        .catch(function (err) {
                            console.log("Error:" + err);
                        });

                });

                it("should return sorted", function () {
                    expect(result.docs.length).toEqual(docs.length);
                });

            });

            describe("sort by name", function () {

                var result;

                beforeEach(function (done) {

                    db.createIndex({
                            index: { fields: ['name'] }
                        }).then(function () {
                            return db.find({
                                    selector: { name: { $exists: true } },
                                    sort: ['name']
                                })
                                .then(function (res) {
                                    result = res;
                                    done();
                                });
                        })
                        .catch(function (err) {
                            console.log("Error:" + err);
                        });

                });

                it("should return sorted", function () {
                    expect(result.docs.length).toEqual(docs.length);
                });

            });

            describe("'and'", function () {

                var result;

                beforeEach(function (done) {

                    db.createIndex({
                            index: { fields: ['series', 'debut'] }
                        }).then(function () {
                            return db.find({
                                    selector: {
                                        $and: [
                                            { series: { $gt: 'Mario' } },
                                            { debut: { $lt: 1990 } }
                                        ]
                                    }
                                    //sort: ['name']
                                })
                                .then(function (res) {
                                    result = res;
                                    done();
                                });
                        })
                        .catch(function (err) {
                            console.log("Error:" + err);
                        });

                });

                it("should return sorted", function () {
                    expect(result.docs.length).toEqual(_.filter(docs, function (doc) { return doc.series > 'Mario' && doc.debut < 1990; }).length);
                });

            });

            describe("'or'", function () {

                var result;

                beforeEach(function (done) {

                    db.createIndex({
                            index: { fields: ['series', 'debut'] }
                        }).then(function () {
                            return db.find({
                                    selector: {
                                        //TODO: $or is not implemented in pouchdb-find
                                        $or: [
                                            { series: { $gt: 'Mario' } },
                                            { debut: { $lt: 1990 } }
                                        ]
                                    }
                                    //sort: ['name']
                                })
                                .then(function (res) {
                                    result = res;
                                    done();
                                });
                        })
                        .catch(function (err) {
                            console.log("Error:" + err);
                        });

                });

                it("should return sorted", function () {
                    expect(result.docs.length).toEqual(_.filter(docs, function (doc) { return doc.series > 'Mario' || doc.debut < 1990; }).length);
                });

            });


        });

    });

});