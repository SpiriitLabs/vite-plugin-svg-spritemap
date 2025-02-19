# Backend integration

ViteJS allows to be use to [serve assets](https://vitejs.dev/guide/backend-integration.html). So, you can connect ViteJS with Wordpress, Drupal or any kind of backend.

> [!IMPORTANT]
> To make `vite-plugin-svg-spritemap` works with this kind of environnment, you will need to handle the right url inside your backend if you are on dev or build.

For example, with `<use>` on dev, using direcly the id of the svg (with the `injectSvgOnDev` option).

```html
<svg>
  <use xlink:href="#sprite-spiriit"></use>
</svg>
```

And in prod, by putting the correct URL manually thanks to [the manifest.json file](https://vitejs.dev/guide/backend-integration.html) information :
```html
<svg>
  <use xlink:href="https://my-cool-website.com/dist/assets/spritemap.95b4c41a.svg#sprite-spiriit"></use>
</svg>
```

To prevent [CORS issue with SVG](https://oreillymedia.github.io/Using_SVG/extras/ch10-cors.html) and `<use>`, you can use the `injectSvgOnDev` option. Don't forget to add the HMR script directly above you close body.

```html
<script type="module" src="http://localhost:5173/@vite-plugin-svg-spritemap/client"></script>
```

You can see an example of integration in the [corresponding demo folder](/demo/server/routes/index.pug).
