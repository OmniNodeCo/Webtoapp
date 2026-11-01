import axios, { AxiosResponse, InternalAxiosRequestConfig } from 'axios';

import { extractTitle, inferTitle } from './inferTitle';

test('it returns the correct title', async () => {
    const axiosGetMock = jest.spyOn(axios, 'get');
    const mockedResponse: AxiosResponse<string> = {
        data: `
      <HTML>
        <head>
          <title>TEST_TITLE</title>
        </head>
      </HTML>`,
        status: 200,
        statusText: 'OK',
        headers: {},
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        config: {} as unknown as InternalAxiosRequestConfig<unknown>,
    };
    axiosGetMock.mockResolvedValue(mockedResponse);
    const result = await inferTitle('someurl');

    expect(axiosGetMock).toHaveBeenCalledTimes(1);
    expect(axiosGetMock).toHaveBeenCalledWith(
        'someurl',
        expect.objectContaining({
            timeout: 10_000,
            maxContentLength: 2 * 1024 * 1024,
        }),
    );
    expect(result).toBe('TEST_TITLE');
    axiosGetMock.mockRestore();
});

test('extractTitle handles multiline markup and entities', () => {
    expect(
        extractTitle(
            '<title data-test="x">  Hello &amp; goodbye\n  <em>world</em> </title>',
        ),
    ).toBe('Hello & goodbye world');
});

test('extractTitle returns undefined when no title exists', () => {
    expect(extractTitle('<html><body>no metadata</body></html>')).toBeUndefined();
});
