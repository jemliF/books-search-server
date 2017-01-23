"use strict";

var searchApp = angular.module('searchApp', ['ngSanitize', 'elasticsearch'])

searchApp.controller('SearchResultsList', function ($scope, searchService) {
    $scope.searchTerms = null
    $scope.noResults = false
    $scope.isSearching = false
    $scope.resultspage = 0
    $scope.results = {
        documentCount: 0,
        documents: []
    }
    var resetResults = function () {
        $scope.results.documents = []
        $scope.results.documentCount = 0
        $scope.noResults = false
        $scope.resultspage = 0
    }
    $scope.getNextPage = function () {
        $scope.resultspage++
        getResults()
    }

    $scope.$watchGroup(['results', 'noResults', 'isSearching'], function () {
        var documentCount = $scope.results.documentCount
        if (!documentCount || documentCount <= $scope.results.documents.length || $scope.isSearching) {
            $scope.canGetNextPage = false
        } else {
            $scope.canGetNextPage = true
        }
    })
    $scope.search = function () {
        console.log($scope.searchTerms)
        resetResults()
        var searchTerms = $scope.searchTerms
        if (searchTerms) {
            $scope.results.searchTerms = searchTerms
        } else {
            return
        }

        getResults()
    }
    var getResults = function () {
        $scope.isSearching = true
        searchService.search($scope.results.searchTerms, $scope.resultspage).then(function (es_return) {
            var totalHits = es_return.hits.total
            if (totalHits > 0) {
                $scope.results.documentCount = es_return.hits.total
                $scope.results.documents.push.apply($scope.results.documents, searchService.formatResults(es_return.hits.hits))
                console.log($scope.results.documents)
            } else {
                $scope.noResults = true
            }
            $scope.isSearching = false
        }, function (error) {
            console.error(error)
            $scope.isSearching = false
        })
    }
})

searchApp.service('searchService', function ($q, esFactory) {
    var esClient = esFactory({
        location: 'localhost:9200'
    })

    this.search = function (searchTerms, resultsPage) {
        var deferred = $q.defer()
        esClient.search({
            index: 'library',
            body: {
                query: {
                    match: {
                        _all: searchTerms
                    }
                }
            },
            from: resultsPage * 10
        }).then(function (es_return) {
            deferred.resolve(es_return)
        }, function (error) {
            deferred.reject(error)
        })
        return deferred.promise
    }

    this.formatResults = function (documents) {
        var formattedResults = []
        documents.forEach(function (document) {
            formattedResults.push(document._source)
        })
        return formattedResults
    }
})