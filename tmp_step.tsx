import React, { useState, useEffect, useCallback, type ComponentType } from "react";
import { Box, CircularProgress, Typography, Alert } from "@mui/material";
import { resolveEntityIdFromApprovalStep } from "@/services/task-resolver.service";
import type { DecisionBoxProps } from "@/components/common/DecisionBox/DecisionBox";
import { BudgetLineApprovalTaskModal } from "./BudgetLineApprovalTaskModal";

interface ApprovalStepResolverProps {
  approvalStepId: string;
  onClose: () => void;
  onSuccess?: (msg: string) => void;
  onError?: (msg: string) => void;
  children: (entityId: string) => React.ReactNode;
}