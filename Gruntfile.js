module.exports = function(grunt) {
	
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-contrib-jasmine');
	
	grunt.initConfig({
		
		pkg: grunt.file.readJSON('package.json'),
		
		uglify: {
			options: {
				sourceMap: true,
				banner: '/* <%= grunt.task.current.target %> v<%= pkg.version %> <%= grunt.template.today("dd-mm-yyyy") %> (C) 2015 Terikon Software */\n'
			},
			kendoPouchDB: {
				src: 'kendo-pouchdb.js',
				dest: 'dist/kendo-pouchdb.min.js'
			}
		},
		
		jshint: {
			all: ['Gruntfile.js', 'kendo-pouchdb.js', 'tests/**/*.js']
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
						'node_modules/pouchdb/dist/pouchdb.js'
					]
				}
			}
		}
		
	});
	
	grunt.registerTask('default', ['uglify']);
	grunt.registerTask('test', ['jasmine']);
};