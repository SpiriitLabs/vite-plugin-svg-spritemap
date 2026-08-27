<script lang="ts">
// Svelte has no `?use` / `?view` loader, so this is how it reaches the sprite
// without hardcoding the route: `href` applies the configured prefix (#135)
import spritemap from 'virtual:spritemap'
</script>

<main>
  <h1>Vite Plugin SVG Spritemap Demo with Svelte</h1>

    <p>This is a demo of the Vite Plugin SVG Spritemap feature.</p>

    <div class="example">
      <h2>Spritemap with &lt;use></h2>

      <div class="example__svgs">
        <svg class="icon icon-spiriit">
          <use xlink:href="/__spritemap#icon-spiriit"></use>
        </svg>
        <svg class="icon icon-vite">
          <use xlink:href="/__spritemap#icon-vite"></use>
        </svg>
      </div>
    </div>

    <div class="example">
      <h2>Spritemap with &lt;img> (fragments)</h2>

      <div class="example__svgs">
        <img alt="" class="icon icon-spiriit" src="/__spritemap#icon-spiriit-view" />
        <img alt="" class="icon icon-vite" src="/__spritemap#icon-vite-view" />
      </div>
    </div>

    <div class="example example--bg-frags">
      <h2>Spritemap with background-image (fragments)</h2>

      <div class="example__svgs">
        <span class="icon icon-spiriit icon-spiriit-frag"></span>
        <span class="icon icon-vite icon-vite-frag"></span>
      </div>
    </div>

    <div class="example example--bg-uri">
      <h2>Spritemap with background-image data uri</h2>

      <div class="example__svgs">
        <span class="icon icon-spiriit"></span>
        <span class="icon icon-vite"></span>
      </div>
    </div>

    <div class="example example--mask-uri">
      <h2>Spritemap with mask data uri</h2>

      <div class="example__svgs">
        <span class="icon icon-spiriit-mask"></span>
        <span class="icon icon-vite-mask"></span>
      </div>
    </div>

    <div class="example">
      <h2>Icons from <code>virtual:spritemap</code></h2>

      <p>
        The references above hardcode <code>/__spritemap</code>. This one does not: it reads the
        url the plugin serves, so it keeps working under a <code>base</code>, a custom
        <code>route</code>, or from a package that does not own the config.
      </p>

      <div class="example__svgs">
        {#each spritemap.icons as icon}
          <svg class="icon icon-{icon}">
            <use xlink:href={spritemap.href(icon)}></use>
          </svg>
        {/each}
      </div>
    </div>
</main>
