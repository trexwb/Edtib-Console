import { viteMockServe } from 'vite-plugin-mock'
// import { localEnabled, prodEnabled } from '/@/config'

export const createMock = () => {
  return viteMockServe({
    // logger: false,
    // ignore: /^index/,
    // localEnabled,
    // prodEnabled,
    // injectCode: `
    //   import { setupProdMockServer } from '/mock/index'
    //   setupProdMockServer()
    //   `,
  })
}
