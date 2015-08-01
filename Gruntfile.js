module.exports = function(grunt) {

	// Load grunt tasks automatically
  	require('load-grunt-tasks')(grunt);

	var lintFiles = ['Gruntfile.js', 'kendo-pouchdb.js', 'kendo-pouchdb.amd.js',
		'tests/spec/*.js', 'tests/*.js'
	];

	grunt.initConfig({

		pkg: grunt.file.readJSON('package.json'),

		uglify: {
			options: {
				sourceMap: true,
				banner: '/* <%= grunt.task.current.target %> v<%= pkg.version %> <%= grunt.template.today("dd-mm-yyyy") %> (C) 2015 Terikon Apps */\n'
			},
			'kendo-pouchdb': {
				src: 'kendo-pouchdb.js',
				dest: 'dist/kendo-pouchdb.min.js'
			},
			'kendo-pouchdb.amd': {
				options: {
					sourceMap: false,
				},
				src: 'kendo-pouchdb.amd.js',
				dest: 'dist/kendo-pouchdb.amd.min.js'
			}
		},

		jshint: {
			all: lintFiles
		},

		kendo_lint: {
			options: {
				force: true
			},
			files: lintFiles
		},

		jasmine: {
			all: {
				src: ['kendo-pouchdb.js', 'tests/testHelper.js'],
				options: {
					specs: 'tests/spec/*Spec.js',
					vendor: [
						'node_modules/jquery/dist/jquery.min.js',
						'node_modules/underscore/underscore-min.js',
						'vendor/kendo/kendo.core.js',
						'vendor/kendo/kendo.data.js',
						'node_modules/pouchdb/dist/pouchdb.js',
						'node_modules/pouchdb-collate/dist/pouchdb-collate.js',
						'node_modules/pouchdb-find/dist/pouchdb.find.js'
					]
				}
			}
		}

	});

	grunt.registerTask('default', ['uglify']);
	grunt.registerTask('test', ['jasmine']);
};