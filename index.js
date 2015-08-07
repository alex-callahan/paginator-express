/**
 * Created by alex on 26.06.2015.
 */
var _ = require('underscore')
    , async = require('async');

function Paginator(query, config) {
    var limit = parseInt(config.limit || 10),
        page = parseInt(config.page || 1) - 1;

    query.limit(limit);
    query.skip(limit * page);

    this.limit = limit;
    this.page = page + 1;
    var totalQ = query.model.count(query._conditions);
    this.data = query.exec();
    this.total = totalQ.exec();
}

function PaginatorController(query, filters) {
    filters = filters || {};
    var Query = query.toConstructor();
    return function (req, res, next) {
        var reqFilters = {};
        _.extend(reqFilters, filters, req.query.filters);
        var paginator = new Paginator(Query(reqFilters, {populate: req.query.populate||''}), {
            limit: req.query.count,
            page: req.query.page
        });
        async.parallel({
            data: function (done) {
                paginator.data.addBack(function (err, data) {
                    done(err, data);
                })
            },
            total: function (done) {
                paginator.total.addBack(done);
            }
        }, function (err, result) {
            if (err)
                return next(err);
            res.set('pagination-totalCount', result.total);
            res.set('pagination-perPage', paginator.limit);
            res.set('pagination-pageCount', Math.ceil(result.total / paginator.limit));
            res.set('pagination-currentPage', paginator.page);
            res.json(result.data)
        });
    }
};

module.exports = {
    paginator: Paginator,
    controller: PaginatorController
};