use anchor_lang::prelude::*;

declare_id!("6gaU2ExKZ7P7xrW7vqPhFrdPGVjM2HV831acJtJgRxH");

#[program]
pub mod solana_twitter {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
