import banner from 'vite-plugin-banner'

export const createBanner = () => {
  // return [
  //   banner(
  //     ` build: \u0056\u0075\u0065\u0020\u0053\u0068\u006f\u0070\u0020\u0056\u0069\u0074\u0065 \n     copyright: \u0068\u0074\u0074\u0070\u0073\u003a\u002f\u002f\u0076\u0075\u0065\u002d\u0061\u0064\u006d\u0069\u006e\u002d\u0062\u0065\u0061\u0075\u0074\u0069\u0066\u0075\u006c\u002e\u0063\u006f\u006d\u002f\u0073\u0068\u006f\u0070\u002d\u0076\u0069\u0074\u0065  \n     time: ${process.env.VITE_APP_UPDATE_TIME} \n`
  //   ),
  // ]
  return banner({
    content: `
      /**
       * Copyright (c) 2024 trexwb
       * All rights reserved.
       * This file is part of the hangzhou damei project.
       */
    `
  }) as any
}
