import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  FormHelperText,
  Grid,
  InputLabel,
  OutlinedInput,
  Stack,
  Typography,
  Box,
} from "@mui/material";

// third party
import * as Yup from "yup";
import { Formik } from "formik";

// mui-icon
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import { LoadingOutlined } from "@ant-design/icons";

import useAuth from "../../hooks/useAuth";
import useSnackbar from "../../hooks/useSnackbar";

// ============================|| AUTHENTICATION - FORGOT PASSWORD ||============================ //

const ResetPassword = () => {
  const navigate = useNavigate();
  const { resetPassword } = useAuth();
  const { successMessage, errorMessage } = useSnackbar();
  return (
    <Stack
      alignItems="center"
      sx={{
        maxWidth: 440,
        width: "100%",
        minHeight: "100vh",
        color: "white",
        mx: "auto",
        my: "50px",
      }}
    >
      <Box sx={{ mb: 4 }}>
        <img
          src="/assets/images/Frame-16.png"
          alt="logo"
          style={{ height: 56 }}
        />
      </Box>
      <Formik
        initialValues={{
          code: "",
        }}
        validationSchema={Yup.object().shape({
          code: Yup.string().max(255).required("Code is required"),
        })}
        onSubmit={async (values, { setSubmitting }) => {
          setSubmitting(true);
          const response = await resetPassword(values);
          setSubmitting(false);
          if (response.status) {
            successMessage(
              "Password reset successful. A temporary password has been sent to your email address."
            );
            navigate("/auth/login");
          } else {
            errorMessage(response.message);
          }
        }}
      >
        {({
          handleBlur,
          handleChange,
          handleSubmit,
          errors,
          isSubmitting,
          touched,
          values,
        }) => (
          <form noValidate onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12 }}>
                <Typography variant="h5" textAlign="center">
                  <b>Verification Code</b>
                </Typography>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Typography textAlign="center">
                  A code has been sent to your email address.
                </Typography>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Stack spacing={1}>
                  <OutlinedInput
                    fullWidth
                    error={Boolean(touched.code && errors.code)}
                    id="code_forgot"
                    type="code"
                    value={values.code}
                    name="code"
                    onBlur={handleBlur}
                    onChange={handleChange}
                    placeholder="Reset code"
                    size="small"
                    sx={{ color: "white", bgcolor: "#252731" }}
                  />
                  {touched.code && errors.code && (
                    <FormHelperText error id="helper-text-code_forgot">
                      {errors.code}
                    </FormHelperText>
                  )}
                </Stack>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Button
                  disableElevation
                  disabled={isSubmitting}
                  fullWidth
                  type="submit"
                  variant="contained"
                  color="primary"
                  startIcon={
                    isSubmitting ? <LoadingOutlined /> : <ArrowUpwardIcon />
                  }
                  size="large"
                >
                  Continue
                </Button>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="center"
                  spacing={1}
                >
                  <Typography
                    onClick={() => navigate("/auth/login")}
                    sx={{
                      cursor: "pointer",
                      "&:hover": { textDecoration: "underline" },
                    }}
                  >
                    Resend Code
                  </Typography>
                </Stack>
              </Grid>
            </Grid>
          </form>
        )}
      </Formik>
    </Stack>
  );
};

export default ResetPassword;
