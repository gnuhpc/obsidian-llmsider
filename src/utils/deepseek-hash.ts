/**
 * DeepSeek PoW (Proof of Work) Hash Calculator using WebAssembly
 * Adapted from deepseek-free-api-master reference implementation
 */

export class DeepSeekHash {
  private wasmInstance: any;
  private offset: number = 0;
  private cachedUint8Memory: Uint8Array | null = null;
  private cachedTextEncoder: TextEncoder = new TextEncoder();

  /**
   * Encode string to WASM memory
   */
  private encodeString(
    text: string,
    allocate: (size: number, align: number) => number,
    reallocate?: (ptr: number, oldSize: number, newSize: number, align: number) => number
  ): number {
    // Simple case: when there's no reallocate function, encode the entire string directly
    if (!reallocate) {
      const encoded = this.cachedTextEncoder.encode(text);
      const ptr = allocate(encoded.length, 1) >>> 0;
      const memory = this.getCachedUint8Memory();
      memory.subarray(ptr, ptr + encoded.length).set(encoded);
      this.offset = encoded.length;
      return ptr;
    }

    // Complex case: handle ASCII and non-ASCII characters in two steps
    const strLength = text.length;
    let ptr = allocate(strLength, 1) >>> 0;
    const memory = this.getCachedUint8Memory();
    let asciiLength = 0;

    // First, try ASCII encoding
    for (; asciiLength < strLength; asciiLength++) {
      const charCode = text.charCodeAt(asciiLength);
      if (charCode > 127) break;
      memory[ptr + asciiLength] = charCode;
    }

    // If there are non-ASCII characters, need to reallocate and handle them
    if (asciiLength !== strLength) {
      if (asciiLength > 0) {
        text = text.slice(asciiLength);
      }

      // Reallocate space for non-ASCII characters (each character needs up to 3 bytes)
      ptr = reallocate(ptr, strLength, asciiLength + text.length * 3, 1) >>> 0;

      // Use encodeInto to handle remaining non-ASCII characters
      const result = this.cachedTextEncoder.encodeInto(
        text,
        this.getCachedUint8Memory().subarray(ptr + asciiLength, ptr + asciiLength + text.length * 3)
      );
      asciiLength += result.written!;

      // Final memory size adjustment
      ptr = reallocate(ptr, asciiLength + text.length * 3, asciiLength, 1) >>> 0;
    }

    this.offset = asciiLength;
    return ptr;
  }

  /**
   * Get WASM memory view
   */
  private getCachedUint8Memory(): Uint8Array {
    if (this.cachedUint8Memory === null || this.cachedUint8Memory.byteLength === 0) {
      this.cachedUint8Memory = new Uint8Array(this.wasmInstance.memory.buffer);
    }
    return this.cachedUint8Memory;
  }

  /**
   * Calculate PoW hash using DeepSeekHashV1 algorithm
   * @returns The calculated nonce/answer, or undefined if solving failed
   */
  public calculateHash(
    algorithm: string,
    challenge: string,
    salt: string,
    difficulty: number,
    expireAt: number
  ): number | undefined {
    if (algorithm !== 'DeepSeekHashV1') {
      throw new Error('Unsupported algorithm: ' + algorithm);
    }

    // Concatenate prefix
    const prefix = `${salt}_${expireAt}_`;

    try {
      // Allocate stack space
      const retptr = this.wasmInstance.__wbindgen_add_to_stack_pointer(-16);

      // Get encoded pointers and lengths
      const ptr0 = this.encodeString(
        challenge,
        this.wasmInstance.__wbindgen_export_0,
        this.wasmInstance.__wbindgen_export_1
      );
      const len0 = this.offset;

      const ptr1 = this.encodeString(
        prefix,
        this.wasmInstance.__wbindgen_export_0,
        this.wasmInstance.__wbindgen_export_1
      );
      const len1 = this.offset;

      // Pass correct length parameters to wasm_solve
      this.wasmInstance.wasm_solve(retptr, ptr0, len0, ptr1, len1, difficulty);

      // Get return result
      const dataView = new DataView(this.wasmInstance.memory.buffer);
      const status = dataView.getInt32(retptr + 0, true);
      const value = dataView.getFloat64(retptr + 8, true);

      // If solving failed, return undefined
      if (status === 0) {
        return undefined;
      }

      return value;
    } finally {
      // Free stack space
      this.wasmInstance.__wbindgen_add_to_stack_pointer(16);
    }
  }

  /**
   * Initialize WASM module from ArrayBuffer
   * @param wasmBuffer ArrayBuffer containing WASM binary
   */
  public async init(wasmBuffer: ArrayBuffer): Promise<any> {
    const imports = { wbg: {} };

    const { instance } = await WebAssembly.instantiate(wasmBuffer, imports);
    this.wasmInstance = instance.exports;
    return this.wasmInstance;
  }
}

/**
 * Singleton instance for Obsidian environment
 */
let hashInstance: DeepSeekHash | null = null;
let wasmInitialized = false;
let wasmInitPromise: Promise<void> | null = null;

/**
 * Get or create the global DeepSeekHash instance
 * @param wasmBuffer Optional ArrayBuffer containing WASM binary (for first initialization)
 */
export async function getDeepSeekHashInstance(wasmBuffer?: ArrayBuffer): Promise<DeepSeekHash> {
  // Create instance if not exists
  if (!hashInstance) {
    hashInstance = new DeepSeekHash();
  }
  
  // Initialize WASM only once, reuse if already initialized
  if (!wasmInitialized && wasmBuffer) {
    // If initialization is in progress, wait for it
    if (wasmInitPromise) {
      await wasmInitPromise;
      return hashInstance;
    }
    
    // Start initialization
    wasmInitPromise = hashInstance.init(wasmBuffer).then(() => {
      wasmInitialized = true;
      wasmInitPromise = null; // Clear promise after completion
    });
    
    await wasmInitPromise;
  }
  
  // If already initialized, just return the existing instance
  if (!wasmInitialized) {
    throw new Error('DeepSeekHash not initialized. Call with wasmBuffer first.');
  }
  
  return hashInstance;
}

/**
 * Calculate PoW hash (convenience function)
 * @param wasmBuffer Optional ArrayBuffer containing WASM binary (only needed for first call)
 */
export async function calculatePoWHash(
  algorithm: string,
  challenge: string,
  salt: string,
  difficulty: number,
  expireAt: number,
  wasmBuffer?: ArrayBuffer
): Promise<number | undefined> {
  const instance = await getDeepSeekHashInstance(wasmBuffer);
  return instance.calculateHash(algorithm, challenge, salt, difficulty, expireAt);
}

/**
 * Cleanup WASM instance to free memory
 * Call this when memory is critical or plugin is unloading
 */
export function cleanupDeepSeekHash(): void {
  hashInstance = null;
  wasmInitialized = false;
  wasmInitPromise = null;
}
