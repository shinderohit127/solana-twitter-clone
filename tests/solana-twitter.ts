import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { SolanaTwitter } from "../target/types/solana_twitter";
import * as assert from "assert";
import * as bs58 from "bs58";

describe("solana-twitter", async () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.SolanaTwitter as Program<SolanaTwitter>;

  // it("Is initialized!", async () => {
  //   // Add your test here.
  //   const tx = await program.methods.initialize().rpc();
  //   console.log("Your transaction signature", tx);
  // });

  it('can send a new tweet', async () => {
    const anchorProvider = program.provider as anchor.AnchorProvider;
    const tweet = anchor.web3.Keypair.generate();
    await program.methods
      .sendTweet('veganism', 'Hummus, am I right?')
      .accounts({
        tweet: tweet.publicKey,
        author: anchorProvider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([tweet])
      .rpc()
    const tweetAccount = await program.account.tweet.fetch(tweet.publicKey);
    assert.equal(tweetAccount.author.toBase58(), anchorProvider.wallet.publicKey.toBase58());
    assert.equal(tweetAccount.topic, 'veganism');
    assert.equal(tweetAccount.content, 'Hummus, am I right?');
    assert.ok(tweetAccount.timestamp);
  });

  it('can send a new tweet without a topic', async () => {
    const anchorProvider = program.provider as anchor.AnchorProvider;
    const tweet = anchor.web3.Keypair.generate();
    await program.methods
      .sendTweet('', 'gm')
      .accounts({
        tweet: tweet.publicKey,
        author: anchorProvider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([tweet])
      .rpc()
    const tweetAccount = await program.account.tweet.fetch(tweet.publicKey);
    assert.equal(tweetAccount.author.toBase58(), anchorProvider.wallet.publicKey.toBase58());
    assert.equal(tweetAccount.topic, '');
    assert.equal(tweetAccount.content, 'gm');
    assert.ok(tweetAccount.timestamp);
  });

  it('can send a new tweet from a different author', async () => {
    const anchorProvider = program.provider as anchor.AnchorProvider;
    const otherUser = anchor.web3.Keypair.generate();
    const signature = await anchorProvider.connection.requestAirdrop(otherUser.publicKey, 1000000000);
    const latestBlockHash = await anchorProvider.connection.getLatestBlockhash();
    await anchorProvider.connection.confirmTransaction({
      blockhash: latestBlockHash.blockhash,
      lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
      signature: signature,
    });
    const tweet = anchor.web3.Keypair.generate();
    await program.methods
      .sendTweet('veganism', 'Yay Tofu!')
      .accounts({
        tweet: tweet.publicKey,
        author: otherUser.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([otherUser, tweet])
      .rpc()
    const tweetAccount = await program.account.tweet.fetch(tweet.publicKey);
    assert.equal(tweetAccount.author.toBase58(), otherUser.publicKey.toBase58());
    assert.equal(tweetAccount.topic, 'veganism');
    assert.equal(tweetAccount.content, 'Yay Tofu!');
    assert.ok(tweetAccount.timestamp);
  });

  it('cannot provide a topic with more than 50 characters', async () => {
    try {
      const anchorProvider = program.provider as anchor.AnchorProvider;
      const tweet = anchor.web3.Keypair.generate();
      const topicWith51Chars = 'x'.repeat(51);
      await program.methods
        .sendTweet(topicWith51Chars, 'Hummus, am I right?')
        .accounts({
          tweet: tweet.publicKey,
          author: anchorProvider.wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([tweet])
        .rpc()
    }
    catch (error) {
      assert.equal(error.error.errorMessage, 'The provided topic should be 50 characters long maximum.');
      return;
    }
    assert.fail('The instruction should have failed with a 51-character topic.');
  });

  it('cannot provide content with more than 280 characters', async () => {
    try {
      const anchorProvider = program.provider as anchor.AnchorProvider;
      const tweet = anchor.web3.Keypair.generate();
      const contentWith281Chars = 'x'.repeat(281);
      await program.methods
        .sendTweet('veganism', contentWith281Chars)
        .accounts({
          tweet: tweet.publicKey,
          author: anchorProvider.wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([tweet])
        .rpc()
    }
    catch (error) {
      assert.equal(error.error.errorMessage, 'The provided content should be 280 characters long maximum.');
      return;
    }
    assert.fail('The instruction should have failed with a 281-character content.');
  });

  it('can fetch all tweets', async () => {
    const tweetAccounts = await program.account.tweet.all();
    assert.equal(tweetAccounts.length, 3);
  });

  it('can filter tweets by author', async () => {
    const anchorProvider = program.provider as anchor.AnchorProvider;
    const authorPublicKey = anchorProvider.wallet.publicKey
    const tweetAccounts = await program.account.tweet.all([
      {
        memcmp: {
          offset: 8,
          bytes: authorPublicKey.toBase58(),
        }
      }
    ]);
    assert.equal(tweetAccounts.length, 2);
    assert.ok(tweetAccounts.every(tweetAccount => {
      return tweetAccount.account.author.toBase58() === authorPublicKey.toBase58()
    }))
  });

  it('can filter tweets by topic', async () => {
    const tweetAccounts = await program.account.tweet.all([
      {
        memcmp: {
          offset: 8+32+8+4,
          bytes: bs58.encode(Buffer.from('veganism')),
        }
      }
    ]);
    assert.equal(tweetAccounts.length, 2);
    assert.ok(tweetAccounts.every(tweetAccount => {
      return tweetAccount.account.topic === 'veganism'
    }))
  })
});