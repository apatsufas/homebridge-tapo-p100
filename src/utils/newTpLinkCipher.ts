export default class NewTpLinkCipher{
    public iv: any; 
    public key: any; 
    private crypto = require('crypto');
    public sig: any;
    public seq: any;

    constructor(localSeed: Buffer, remoteSeed: Buffer, authHash: Buffer) {
      this.calculateKey(localSeed, remoteSeed, authHash);
      this.calculateIvSeq(localSeed, remoteSeed, authHash);
      this.calculateSig(localSeed, remoteSeed, authHash);
    }
  
    public encrypt(data: Buffer | string) {
      this.seq += 1;
  
      if (typeof data === 'string') {
        data = Buffer.from(data, 'utf8');
      }
  
      const cipher = this.crypto.createCipheriv('aes-128-cbc', this.key, this.ivSeqPair());
      const cipherText = Buffer.concat([cipher.update(data), cipher.final()]);
  
      const seqBuffer = Buffer.alloc(4);
      seqBuffer.writeInt32BE(this.seq, 0);
  
      const hash = this.crypto.createHash('sha256');
      hash.update(Buffer.concat([this.sig, seqBuffer, cipherText]));
  
      const signature = hash.digest();
  
      return {
        encryptedPayload: Buffer.concat([signature, cipherText]),
        seq: this.seq,
      };
    }
  
    public decrypt(data: Buffer) {
      const decipher = this.crypto.createDecipheriv(
        'aes-128-cbc',
        this.key,
        this.ivSeqPair(),
      );
      const decrypted = Buffer.concat([
        decipher.update(data.subarray(32)),
        decipher.final(),
      ]);
  
      return decrypted.toString('utf8');
    }
  
    private calculateKey(local_seed: Buffer, remote_seed: Buffer, auth_hash: Buffer) {
      const buf = Buffer.concat([Buffer.from('lsk'), local_seed, remote_seed, auth_hash]);
      const hash = this.crypto.createHash('sha256').update(buf).digest();
      this.key = hash.subarray(0, 16);
    }
  
    private calculateIvSeq(local_seed: Buffer, remote_seed: Buffer, auth_hash: Buffer) {
      const buf = Buffer.concat([Buffer.from('iv'), local_seed, remote_seed, auth_hash]);
      const ivBuf = this.crypto.createHash('sha256').update(buf).digest();
      this.seq = ivBuf.subarray(-4).readInt32BE(0);
      this.iv = ivBuf.subarray(0, 12);
    }
  
    private calculateSig(local_seed: Buffer, remote_seed: Buffer, auth_hash: Buffer) {
      const payload = Buffer.concat([Buffer.from('ldk'), local_seed, remote_seed, auth_hash]);
      this.sig = this.crypto.createHash('sha256').update(payload).digest().subarray(0, 28);
    }
  
    private ivSeqPair() {
      const seq = Buffer.alloc(4);
      seq.writeInt32BE(this.seq, 0);
      return Buffer.concat([this.iv, seq]);
    }
}
   