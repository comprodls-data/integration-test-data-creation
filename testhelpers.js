'use strict';

/*************************************************************************
 *
 * COMPRO CONFIDENTIAL
 * __________________
 *
 *  [2015] - [2020] Compro Technologies Private Limited
 *  All Rights Reserved.
 *
 * NOTICE:  All information contained herein is, and remains
 * the property of Compro Technologies Private Limited. The
 * intellectual and technical concepts contained herein are
 * proprietary to Compro Technologies Private Limited and may
 * be covered by U.S. and Foreign Patents, patents in process,
 * and are protected by trade secret or copyright law.
 *
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Compro Technologies Pvt. Ltd..
 */

var request = require('superagent');
var assert = require('chai').assert;

function post(requestURL, paramJSON, requestHeader, callback) {
    var post = requestURL;
    var send = paramJSON;
    var set = requestHeader;

    request
        .post(post)
        .send(send)
        .set(set)
        .end(callback);
}

function put(requestURL, requestBody, requestHeader, callback) {
    var url = requestURL;
    var body = requestBody;
    var header = requestHeader;

    request
        .put(url)
        .send(body)
        .set(header)
        .end(callback);
}

function get(requestURL, queries, requestHeader, callback) {
    var url = requestURL;
    var queryArray = queries;
    var set = requestHeader;

    request
        .get(url)
        .query(queryArray[0])
        .set(set)
        .end(callback);
}

function postAttachment(requestURL, paramJSON, attachment, requestHeader, callback) {
    var post = requestURL;
    var send = paramJSON;
    var set = requestHeader;
    request
        .post(post)
        .attach("file" , attachment)
        .query(send)
        .set(set)
        .end(callback);
}

function del(requestURL, queries, requestHeader, callback) {
    var url = requestURL;
    var queryArray = queries;
    var set = requestHeader;

    request
        .del(url)
        .query(queryArray[0])
        .set(set)
        .end(callback);
}

module.exports = {
    post: post,
    get: get,
    del: del,
    put: put,
    uploadFile:postAttachment
};
