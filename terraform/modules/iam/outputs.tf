output "collector_role_arn" {
  description = "ARN of the IAM role used by the CloudLedger collector"
  value       = aws_iam_role.cloudledger_collector.arn
}

output "collector_policy_arn" {
  description = "ARN of the read-only inspection policy"
  value       = aws_iam_policy.cloudledger_read_only.arn
}
