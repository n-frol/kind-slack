# KIND Snacks

## Development Requirements

- nodejs >= 8
- yarn (`npm install -g yarn`)
- dwre-tools with the `abc` project in your ~/.dwre.json file
- **OR** a `dw.json` file in the current directory with this format:

```json
{
    "hostname": "your-sandbox-hostname.demandware.net",
    "username": "yourlogin",
    "password": "yourpwd",
    "code-version": "version_to_upload_to"
}
```

## Development Setup

```sh
$ yarn install
$ yarn start
```

## Production Building

```sh
$ yarn build
```

## Linting

**NOTE:** Recommend that your `webpack.config.js` files use eslint-loader (see `app_example` cartridge) for linting purposes on the fly and during production builds.

```sh
$ yarn lint
```

## Adding New Subtrees (plugins/etc)

It is recommended to use git subtrees to handle project dependencies wherever possible and where another dependency tool isn't appropriate (i.e. npm).

See [https://www.atlassian.com/blog/git/alternatives-to-git-submodule-git-subtree](https://www.atlassian.com/blog/git/alternatives-to-git-submodule-git-subtree) and [https://git-scm.com/book/en/v1/Git-Tools-Subtree-Merging](https://git-scm.com/book/en/v1/Git-Tools-Subtree-Merging) to learn about git subtrees

Example of adding a plugin for git subtrees:

```sh
$ git remote add -f plugin_wishlists git@github.com:SalesforceCommerceCloud/plugin_wishlists.git
$ git subtree add --prefix plugin_wishlists plugin_wishlists master --squash
```

### Updating a subtree from upstream

```sh
$ git subtree pull --prefix plugin_wishlists plugin_wishlists master --squash
```

