const { src, dest, watch, series, parallel } = require("gulp");
// 直列処理(順番に処理):series(), 並列処理（順番を問わない）:parallel()
const sass = require("gulp-sass");
const plumber = require("gulp-plumber");
const postcss = require("gulp-postcss");
const autoprefixer = require("autoprefixer");
const ejs = require("gulp-ejs");
const rename = require("gulp-rename");
const replace = require("gulp-replace");
const cssdeclsort = require("css-declaration-sorter");
const sassGlob = require("gulp-sass-glob"); // @importを纏めて指定
const browserSync = require("browser-sync");
const gcmq = require("gulp-group-css-media-queries"); // media queryを纏める
const mode = require("gulp-mode")({
  modes: ["production", "development"], // 本番実装時は 'gulp --production'
  default: "development",
  verbose: false,
});
const webpack = require("webpack");
const webpackStream = require("webpack-stream"); // gulpでwebpackを使うために必要なプラグイン

// webpackの設定ファイルの読み込み
const webpackConfig = require("./webpack.config");

const compileSass = (done) => {
  const postcssPlugins = [
    autoprefixer({
      // browserlistはpackage.jsonに記載[推奨]
      cascade: false,
      // grid: 'autoplace' // IE11のgrid対応('-ms-')
    }),
    cssdeclsort({ order: "alphabetical" /* smacss, concentric-css */ }),
  ];

  src("./src/scss/**/*.scss", { sourcemaps: true /* init */ })
    .pipe(plumber())
    .pipe(sassGlob())
    .pipe(sass({ outputStyle: "expanded" }))
    .pipe(postcss(postcssPlugins))
    .pipe(mode.production(gcmq()))
    .pipe(dest("./dist/css", { sourcemaps: "./sourcemaps" /* write */ }));
  done(); // 終了宣言
};

// ローカルサーバ起動
const buildServer = (done) => {
  browserSync.init({
    port: 3000,
    notify: false,
    // 静的サイト
    server: {
      baseDir: "./dist/",
    },
    // 動的サイト
    // files: ['./**/*.php'],
    // proxy: 'http://localsite.wp/',
  });
  done();
};

// ブラウザ自動リロード
const browserReload = (done) => {
  browserSync.reload();
  done();
};

const compileEjs = (done) => {
  src(["./ejs/**/*.ejs", "!" + "./ejs/**/_*.ejs"])
    .pipe(plumber())
    .pipe(ejs())
    .pipe(rename({ extname: ".html" }))
    .pipe(replace(/[\s\S]*?(<!DOCTYPE)/, "$1"))
    .pipe(dest("./dist/"));
  done();
};

// webpack
const bundleJs = () => {
  // webpackStreamの第2引数にwebpackを渡す
  return webpackStream(webpackConfig, webpack)
    .on("error", function (e) {
      this.emit("end");
    })
    .pipe(dest("./dist/js"));
};

// ファイル監視
const watchFiles = () => {
  watch("./**/*.html", browserReload);
  watch("./src/scss/**/*.scss", series(compileSass, browserReload));
  watch("./src/js/**/*.js", series(bundleJs, browserReload));
  watch("./ejs/**/*.ejs", series(compileEjs, browserReload));
};

exports.sass = compileSass;
exports.ejs = compileEjs;
exports.default = parallel(buildServer, watchFiles);
