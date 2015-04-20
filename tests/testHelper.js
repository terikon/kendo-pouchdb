/* global $,kendo,PouchDB */

var testHelper = testHelper || {};

//Returns event spy {events:array, dispose:function, reset:function}.
//events[i] is {e:*}.
testHelper.spyKendoEvent = function (instance, eventName) {
    'use strict';

    var handler = function (e) {
            var copy = $.extend(true, {}, e);
            result.events.push({ e: copy });
        },
        dispose = function () {
            instance.unbind(eventName, handler);
            this.reset();
        },
        reset = function () {
            result.events = [];
        },
        result = {
            events: [],
            dispose: dispose,
            reset: reset
        };

    instance.bind(eventName, handler);

    return result;
};

//Returns promise that resolves when change event occurs on PouchDB specified number of times.
testHelper.waitForDbChanges = function (db, numberOfChanges) {
    var counter = 0,
        deferred = new $.Deferred(),
        handler = function () {
            counter++;
            if (counter === numberOfChanges) {
                changes.removeListener("change", handler);
                deferred.resolve();
            }
        },
        changes = db.changes({
            since: 'now',
            live: true
        });

    changes.on("change", handler);

    return deferred.promise();
};

testHelper.addArrayToDataSource = function (dataSource, rows) {
    $.each(rows, function (_, row) {
        dataSource.add(row);
    });
};
