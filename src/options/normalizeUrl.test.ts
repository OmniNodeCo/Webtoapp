import { normalizeUrl } from './normalizeUrl';

test("a proper URL shouldn't be mangled", () => {
    expect(normalizeUrl('http://www.google.com')).toEqual(
        'http://www.google.com/',
    );
});

test('missing protocol should default to https', () => {
    expect(normalizeUrl('www.google.com')).toEqual('https://www.google.com/');
});

test('unsafe schemes are rejected before they reach Electron', () => {
    expect(() => normalizeUrl('javascript:alert(1)')).toThrow(
        'only http:// and https:// URLs are supported',
    );
    expect(() => normalizeUrl('file:///tmp/index.html')).toThrow(
        'only http:// and https:// URLs are supported',
    );
});

test('embedded credentials are rejected', () => {
    expect(() => normalizeUrl('https://user:password@example.com')).toThrow(
        'embedded credentials are not supported',
    );
});

test('malformed URLs are rejected', () => {
    expect(() => normalizeUrl('http://ssddfoo bar')).toThrow(
        'Your url "http://ssddfoo bar" is invalid',
    );
});
