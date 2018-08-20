module.exports = {
  extends: ["airbnb-base", "prettier"],
  env: {
    browser: true
  },
  plugins: ["prettier"],
  rules: {
    semi: 2,
    quotes: ["error", "single"]
  }
};
