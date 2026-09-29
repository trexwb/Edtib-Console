import replace from '@rollup/plugin-replace'

export const createReplace = () => {
  return replace({
    preventAssignment: true,
    values: {
      __BASE_URL__: JSON.stringify('http://b.com/a/static/')
    }
  }) as any // 强制类型转换

  // return {
  //   name: 'html-transform',
  //   transformIndexHtml(html, ctx) {
  //     return html.replace(/\/console\/static\//g, assetUrl || `https://oss.lixitu.com/console/${nodeEnv === 'production' ? 'master' : nodeEnv}/static/`);
  //   }
  // }
}
