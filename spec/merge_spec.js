'use strict';

const odata = require('../index');
const request = require('../request');


const config = {
  version: '2.0',
  headers: {Accept: 'application/json'}
};

describe('Merge (ODATA v2) tests', function () {

  it('should merge a product', function (done) {

    request({
      uri: 'http://services.odata.org/V2/(S(readwrite))/OData/OData.svc',
      followRedirect: false
    }, function (err, response) {

      var q = function () {
        return odata(Object.assign({service: 'http://services.odata.org' + response.headers.location}, config));
      };
      var productId;

      // get every products
      q().resource('Products')
        .get()
        .then(function (res) {
          expect(res.statusCode).toEqual(200);
          productId = JSON.parse(res.body).d[0].ID;

          // update the first product
          return q().resource('Products', productId)
            .merge({Name: 'Updated Bread'});
        })
        .then(function (res) {
          expect(res.statusCode).toEqual(204);

          // get the updated product
          return q().resource('Products', productId).get()
        })
        .then(function (res) {
          expect(res.statusCode).toEqual(200);
          var updatedProduct = JSON.parse(res.body).d;
          expect(updatedProduct.Name).toEqual('Updated Bread');
        })
        .catch(function (err) {
          fail(err);
        })
        .finally(done);
    });

  });

  it('should batch merge products', function (done) {

    request({
      uri: 'http://services.odata.org/(S(readwrite))/V2/OData/OData.svc',
      followRedirect: false
    }, function (err, response) {

      var q = function () {
        // I have to replace the location because the url /V2/(S(xxx))/OData/ is refused.
        // The OData service only accepts /(S(xxx))/V2/OData/
        var id = response.headers.location.match(/\/(\(S\([a-z0-9]+\)\))\//)[1];
        return odata(Object.assign({service: `http://services.odata.org/${id}/V2/OData/OData.svc`}, config));
      };

      // get every products
      q().resource('Products')
        .get()
        .then(function (res) {
          expect(res.statusCode).toEqual(200);
          var products = JSON.parse(res.body).d;
          var batch = q().batch();
          products.forEach(function (product) {
            batch.resource('Products', product.ID)
              .merge({Name: product.Name + " (UPDATED)"});
          });

          // update the first product
          return batch.send();
        })
        .then(function (res) {
          expect(res.statusCode).toEqual(202); // Accepted

          // get every products
          return q().resource('Products').get()
        })
        .then(function (res) {
          expect(res.statusCode).toEqual(200);
          var products = JSON.parse(res.body).d;
          products.forEach(function (product) {
            expect(product.Name).toMatch(/ \(UPDATED\)$/);
          });
        })
        .catch(function (err) {
          fail(err);
        })
        .finally(done);
    });

  });

});