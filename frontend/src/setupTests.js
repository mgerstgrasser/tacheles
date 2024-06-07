import '@testing-library/jest-dom';
import { TextDecoder, TextEncoder } from 'text-encoding';

// Here we set up a couple of helpers for testing. This is needed because not everything
// thats available in a browser is available in the test environment.
// Check out the __tests__ directory for the tests.

global.TextDecoder = TextDecoder;
global.TextEncoder = TextEncoder;
