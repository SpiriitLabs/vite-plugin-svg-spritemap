# Backend integration

ViteJS can be used to [serve assets](https://vitejs.dev/guide/backend-integration.html). So, you can connect ViteJS with WordPress, Drupal or any kind of backend.

> [!IMPORTANT]
> To make `vite-plugin-svg-spritemap` work with this kind of environment, you will need to handle the right URL inside your backend if you are on dev or build.

For example, with `<use>` on dev, using directly the id of the svg (with the [`injectSvgOnDev`](/options/#injectsvgondev) option).

```html
<svg>
  <use xlink:href="#sprite-spiriit"></use>
</svg>
```

And in production, by putting the correct URL manually thanks to [the manifest.json file](https://vitejs.dev/guide/backend-integration.html) information:
```html
<svg>
  <use xlink:href="https://my-cool-website.com/dist/assets/spritemap.95b4c41a.svg#sprite-spiriit"></use>
</svg>
```

To prevent [CORS issue with SVG](https://oreillymedia.github.io/Using_SVG/extras/ch10-cors.html) and `<use>`, you can use the [`injectSvgOnDev`](/options/#injectsvgondev) option. Don't forget to add the HMR script directly above your close body (**only on dev**) if vite is not processing your index HTML file.

```html
<script type="module" src="http://localhost:5173/@vite-plugin-svg-spritemap/client"></script>
```

You can see an example of backend integration in the server example folder [examples](/examples).
