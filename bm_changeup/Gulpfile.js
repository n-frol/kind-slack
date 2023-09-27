'use strict'

var gulp = require('gulp');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var riot = require('gulp-riot');

function compileJS() {

  return gulp.src(['cartridge/client/v2/js/tags.js'])
  .pipe(riot({compact: true}))
  .pipe(gulp.src([
   'cartridge/client/v2/js/libs.js',
	 'cartridge/client/v2/js/app.js',
  ]))
  .pipe(concat('changeUp.js'))
  .pipe(uglify())
  .pipe(gulp.dest('cartridge/static/default/js_v2'));

}

function defaultTask(done) {
	
	compileJS()

}

gulp.task('default', defaultTask);
