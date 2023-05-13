// Uncommit when doing production
require("dotenv").config();
const { src, dest, series, watch, parallel } = require("gulp");
const gulpIf = require("gulp-if");
const include = require("gulp-include");
const concat = require("gulp-concat");
const clean = require("gulp-clean");
const sourcemaps = require("gulp-sourcemaps");
// HTML
const htmlmin = require("gulp-htmlmin");
const htmlBeautify = require("gulp-html-beautify");
const gulpHandlebarsFileInclude = require('gulp-handlebars-file-include');
// styles
const scss = require("gulp-sass")(require("sass"));
const autoPrefixer = require("gulp-autoprefixer");
const cssBeautify = require("gulp-cssbeautify");
const cssMinify = require("gulp-clean-css");
// scripts
const jsMinify = require("gulp-terser");
const babel = require("gulp-babel");
// Others
const accessibility = require('gulp-accessibility');
const { init,reload } = require("browser-sync");

// BrowserSync
const browserSync = require('browser-sync').create();
// Production
const isProd = process.env.NODE_ENV === "prod";

// SOURCE VARIABLES
const PUBLIC = "public/";
const SRC_HTML_PATH = "./src/*.html";
const SRC_PARTIALS_PATH = "./src/partials/*.*"
const DEST_HTML_PATH = "./public/**/*.html"
const SRC_STYLES_PATH = "./src/styles/styles.scss";
const SRC_ALLSTYLES_PATH = "./src/styles/**/*.scss";
const DEST_STYLES_PATH = "./public/assets/styles/";
const SRC_SCRIPTS_PATH = "./src/scripts/**/*.js";
const DEST_SCRIPTS_PATH = "./public/assets/scripts/";
const PREFIXER_VERSIONS = "last 2 versions";

// Other Variables
const htmlFile = [SRC_HTML_PATH];
const nothtmlFile = ["./src/*.*", "!src/*.html"];

function html() {
  return src(htmlFile)
    .pipe(gulpHandlebarsFileInclude({}, {maxRecursion: 25}))
    .pipe(htmlBeautify())
    .pipe(
      gulpIf(
        isProd,
        htmlmin({ collapseWhitespace: true, removeComments: true })
      )
    )
    .pipe(dest(PUBLIC));
}

function rootFiles() {
  return src(nothtmlFile).pipe(dest(PUBLIC));
}

function styles() {
  return src(SRC_STYLES_PATH)
    .pipe(gulpIf(!isProd, sourcemaps.init()))
    .pipe(scss({
      includePaths: ['node_modules']
    }))
    .pipe(autoPrefixer(PREFIXER_VERSIONS))
    .pipe(gulpIf(!isProd, sourcemaps.write()))
    .pipe(
      cssBeautify({
        indent: "   ",
        openbrace: "separate-line",
        autosemicolon: true,
      })
    )
    .pipe(gulpIf(isProd, cssMinify()))
    .pipe(dest(DEST_STYLES_PATH));
}

function scripts() {
  return src(SRC_SCRIPTS_PATH)
    .pipe(gulpIf(!isProd, sourcemaps.init()))
    .pipe(
      include({
        extensions: "js",
        hardFail: true,
      })
    )
    .pipe(concat("all.js"))
    .pipe(gulpIf(!isProd, sourcemaps.write()))
    .pipe(gulpIf(isProd, jsMinify()))
    .pipe(dest(DEST_SCRIPTS_PATH));
}

// clean folder before build
function del() {
  return src(PUBLIC, { allowEmpty: true, read: false }).pipe(clean());
}


function serve() {
  init({
    open: true,
    server: {
      baseDir: './public/'
    }
  })
}

function browserSyncReload(done) {
  reload();
  done();
}

// watch task
function watchTask() {
  watch([...htmlFile], series(html, browserSyncReload));
  watch(nothtmlFile, series(rootFiles, browserSyncReload));
  watch(SRC_ALLSTYLES_PATH, series(styles, browserSyncReload));
  watch(SRC_SCRIPTS_PATH, series(scripts, browserSyncReload));
  watch(SRC_PARTIALS_PATH, series(html, browserSyncReload));
}

exports.serve = parallel(html, styles, scripts, rootFiles, watchTask, serve);
exports.default = series(del, html, styles, scripts, rootFiles);


// Check Accessibility 
function accessibilityReport() {
  return src(DEST_HTML_PATH)
    .pipe(accessibility({
      force: true
    }))
    .on('error', console.log)
    .pipe(accessibility.report({ reportType: 'txt' }))
    .pipe(gulp.dest('reports'));
}