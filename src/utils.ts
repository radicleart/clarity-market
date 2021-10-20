export const formatBuffString = (buffer: string): ArrayBuffer => {
  return new TextEncoder().encode(buffer);
};

export const hexStringToArrayBuffer = (hexString: string): ArrayBuffer => {
  // remove the leading 0x
  hexString = hexString.replace(/^0x/, "");

  // ensure even number of characters
  if (hexString.length % 2 != 0) {
    console.log(
      "WARNING: expecting an even number of characters in the hexString"
    );
  }

  // check for some non-hex characters
  var bad = hexString.match(/[G-Z\s]/i);
  if (bad) {
    console.log("WARNING: found non-hex characters", bad);
  }

  // split the string into pairs of octets
  var pairs = hexString.match(/[\dA-F]{2}/gi);

  if (!pairs) {
    throw new Error("pairs is null");
  }

  // convert the octets to integers
  var integers = pairs.map(function (s) {
    return parseInt(s, 16);
  });

  var array = new Uint8Array(integers);
  // console.log(array);

  return array.buffer;
};
