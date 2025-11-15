// PostCSS configuration for LLMSider plugin
module.exports = {
  plugins: [
    require('postcss-import'),  // Process @import statements
    require('postcss-csso')({   // Minify CSS
      restructure: true,
      comments: false
    })
  ]
};
