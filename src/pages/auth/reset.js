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
    <Stack alignItems="center" justifyContent="center" sx={{ maxWidth: 440 }}>
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
              "Success to reset. A temporary password has been sent to your email address."
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
                <Typography variant="h4" textAlign="center">
                  <b>Reset password</b>
                </Typography>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Typography>
                  Please enter a code that was sent to your code address and
                  your password will be reset.
                </Typography>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Stack spacing={1}>
                  <InputLabel htmlFor="code_forgot">Code*</InputLabel>
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
                  Submit
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

export default ResetPassword;
