#!/bin/bash

# Script to apply all Supabase migrations in order
# This script outputs the SQL files in the correct order for you to run in Supabase Dashboard

echo "=========================================="
echo "Supabase Migration Application Script"
echo "=========================================="
echo ""
echo "Run these migrations in order in the Supabase Dashboard SQL Editor:"
echo ""
echo "1. 20251109172320_335caa2d-9e2c-43d1-a948-d071f6f12d88.sql (Initial schema)"
echo "2. 20251112230445_3db5d6cf-55ab-4aee-816e-4545ea9456b3.sql (Guest identity functions)"
echo "3. 20251112230536_d6a6212b-ea1d-4e44-8925-0727ab49d0b9.sql (Poll vote counts view)"
echo "4. 20251112230620_f47fc457-d5c1-421a-be2e-cf00b8651f23.sql (Guest-created polls security)"
echo "5. 20251122140412_9027bec6-c1e2-441b-a407-10d81f4cfe0d.sql (Function security fixes)"
echo "6. 20251202160059_fix_votes_rls_policy.sql (Fix votes viewing)"
echo "7. 20251207161229_fix_votes_insert_policy.sql (Fix guest voting - CRITICAL!)"
echo ""
echo "All migration files are in: supabase/migrations/"
echo ""
echo "Copy each file's contents into the Supabase Dashboard SQL Editor and run them in order."
echo "=========================================="

