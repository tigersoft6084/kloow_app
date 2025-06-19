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
} from "@mui/material";

// third party
import * as Yup from "yup";
import { Formik } from "formik";

// mui-icon
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import { LoadingOutlined } from "@ant-design/icons";

import useAuth from "../../hooks/useAuth";
import useSnackbar from "../../hooks/useSnackbar";

// ============================|| AUTHENTICATION - FORGOT PASSWORD ||============================ //

const ForgotPassword = () => {
  const navigate = useNavigate();
  const { forgotPassword } = useAuth();
  const { successMessage, errorMessage } = useSnackbar();
  return (
    <Stack alignItems="center" justifyContent="center" sx={{ maxWidth: 440 }}>
      <Formik
        initialValues={{
          email: "",
        }}
        validationSchema={Yup.object().shape({
          email: Yup.string()
            .email("Must be a valid email")
            .max(255)
            .required("Email is required"),
        })}
        onSubmit={async (values, { setSubmitting }) => {
          setSubmitting(true);
          const response = await forgotPassword(values);
          setSubmitting(false);
          if (response.status) {
            successMessage("The code was sent to you email address.");
            navigate("/auth/reset");
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
                <Typography variant="h4" textAlign="center">
                  <b>Forgot you password?</b>
                </Typography>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Typography>
                  Please provide your email address and we{"'"}ll send you
                  instructions on how to change your password.
                </Typography>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Stack spacing={1}>
                  <InputLabel htmlFor="email_forgot">Email*</InputLabel>
                  <OutlinedInput
                    fullWidth
                    error={Boolean(touched.email && errors.email)}
                    id="email_forgot"
                    type="email"
                    value={values.email}
                    name="email"
                    onBlur={handleBlur}
                    onChange={handleChange}
                    placeholder="Enter email address"
                  />
                  {touched.email && errors.email && (
                    <FormHelperText error id="helper-text-email_forgot">
                      {errors.email}
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
                    isSubmitting ? <LoadingOutlined /> : <RestartAltIcon />
                  }
                  size="large"
                >
                  Reset
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
                    Login
                  </Typography>
                  <Typography>
                    <b>&#xb7;</b>
                  </Typography>
                  <Typography
                    onClick={() => navigate("/auth/signup")}
                    sx={{
                      cursor: "pointer",
                      "&:hover": { textDecoration: "underline" },
                    }}
                  >
                    Create account
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

export default ForgotPassword;
