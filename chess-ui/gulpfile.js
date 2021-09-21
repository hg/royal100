const gulp = require("gulp");
const less = require("gulp-less");
const csso = require("gulp-csso");
const NpmImportPlugin = require("less-plugin-npm-import");
const LessAutoprefix = require("less-plugin-autoprefix");

gulp.task("themes", function () {
  const autoprefix = new LessAutoprefix({
    browsers: ["last 2 versions"],
  });

  return gulp
    .src("./src/themes/theme.*.less")
    .pipe(
      less({
        javascriptEnabled: true,
        plugins: [new NpmImportPlugin({ prefix: "~" }), autoprefix],
      })
    )
    .pipe(csso({ debug: true }))
    .pipe(gulp.dest("./public/css"));
});
